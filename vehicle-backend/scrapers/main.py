#!/usr/bin/env python3
"""
Punto de Entrada del Scraper de Tenencias y Subsidios Vehiculares.
Ejecución diaria a las 8:00 AM (vía Cron / APScheduler) o manual.
"""

import os
import sys
import sqlite3
import argparse
import logging
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Importar lógica de scraping
from portal_scraper import scrape_vehicle_portal

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("ScraperMain")

def get_db_path():
    env_path = os.getenv("DB_PATH")
    if env_path:
        # Resolver relativo al script si es necesario
        if not os.path.isabs(env_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidate = os.path.normpath(os.path.join(base_dir, env_path.replace('./', '')))
            if os.path.exists(candidate) or os.path.exists(os.path.dirname(candidate)):
                return candidate
        return env_path
    
    # Ruta por defecto estándar
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data", "vehicles.sqlite")


def run_scraper(plate_filter=None):
    db_path = get_db_path()
    logger.info(f"Conectando a base de datos SQLite: {db_path}")

    if not os.path.exists(db_path):
        logger.error(f"Base de datos no encontrada en: {db_path}. Por favor inicia primero el backend o corre initDatabase().")
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Buscar vehículos
        if plate_filter:
            cursor.execute("""
                SELECT v.id as vehicle_id, v.user_id, v.plate, v.state, u.email, u.fcm_token
                FROM vehicles v
                JOIN users u ON v.user_id = u.id
                WHERE UPPER(v.plate) = UPPER(?)
            """, (plate_filter.strip(),))
        else:
            cursor.execute("""
                SELECT v.id as vehicle_id, v.user_id, v.plate, v.state, u.email, u.fcm_token
                FROM vehicles v
                JOIN users u ON v.user_id = u.id
            """)
        
        vehicles = cursor.fetchall()
        logger.info(f"Vehículos a procesar: {len(vehicles)}")

        if not vehicles and plate_filter:
            logger.warning(f"No se encontró vehículo con placa {plate_filter} en la base de datos.")
            return True

        for v in vehicles:
            v_id = v['vehicle_id']
            u_id = v['user_id']
            plate = v['plate']
            state = v['state']
            fcm_token = v['fcm_token']

            logger.info(f"--- Procesando Placa {plate} (Estado: {state}, Usuario ID: {u_id}) ---")

            try:
                # 1. Ejecutar scraping con tolerancia a fallos
                scraped_data = scrape_vehicle_portal(plate, state)

                # 2. Actualizar o insertar en vehicle_tenencias
                year = scraped_data.get('year', datetime.now().year)
                tenencia_amount = scraped_data.get('tenencia_amount', 3200.0)
                subsidy_amount = scraped_data.get('subsidy_amount', 3200.0)
                refrendo_amount = scraped_data.get('refrendo_amount', 698.0)
                total_due = scraped_data.get('total_due', 698.0)
                due_date = scraped_data.get('due_date', f"{year}-03-31")
                subsidy_active = 1 if scraped_data.get('subsidy_active') else 0
                subsidy_condition = scraped_data.get('subsidy_condition', '')
                status = scraped_data.get('status', 'PENDIENTE')
                promotions = scraped_data.get('promotions', '')

                cursor.execute("""
                    INSERT INTO vehicle_tenencias (
                        vehicle_id, year, tenencia_amount, subsidy_amount, refrendo_amount,
                        total_due, due_date, subsidy_active, subsidy_condition, status, promotions, last_scraped_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
                    ON CONFLICT(vehicle_id, year) DO UPDATE SET
                        tenencia_amount = excluded.tenencia_amount,
                        subsidy_amount = excluded.subsidy_amount,
                        refrendo_amount = excluded.refrendo_amount,
                        total_due = excluded.total_due,
                        due_date = excluded.due_date,
                        subsidy_active = excluded.subsidy_active,
                        subsidy_condition = excluded.subsidy_condition,
                        status = excluded.status,
                        promotions = excluded.promotions,
                        last_scraped_at = excluded.last_scraped_at
                """, (
                    v_id, year, tenencia_amount, subsidy_amount, refrendo_amount,
                    total_due, due_date, subsidy_active, subsidy_condition, status, promotions
                ))
                logger.info(f"[DB] Registro de tenencia actualizado para vehículo {plate} (Total a pagar: ${total_due})")

                # 3. Generar Notificación para el usuario
                # Restricción UNIQUE crítica en (user_id, type, created_at)
                # Formato de timestamp único por ejecución del scraper
                now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                notification_type = 'SUBSIDIO_EXPIRING' if subsidy_active else 'TENENCIA_DUE'
                notification_title = f"¡Subsidio Activo 100%! - Placa {plate}" if subsidy_active else f"Adeudo Vehicular Detectado - Placa {plate}"
                notification_message = (
                    f"Tu tenencia 2026 tiene 100% de subsidio. Paga solo tu refrendo de ${total_due:.2f} antes del {due_date}."
                    if subsidy_active else
                    f"Presentas un total a pagar de ${total_due:.2f} para tu vehículo con placa {plate}."
                )

                try:
                    cursor.execute("""
                        INSERT INTO notifications (user_id, type, title, message, created_at)
                        VALUES (?, ?, ?, ?, ?)
                    """, (u_id, notification_type, notification_title, notification_message, now_str))
                    logger.info(f"[DB] Notificación generada exitosamente para usuario {u_id}: {notification_title}")
                except sqlite3.IntegrityError as ie:
                    # VALIDACIÓN CRÍTICA: La base de datos tiene UNIQUE constraint (user_id, type, created_at)
                    logger.warning(f"[DB] Notificación duplicada prevenida por UNIQUE constraint: {ie}")

                conn.commit()

            except Exception as ve:
                # VALIDACIÓN CRÍTICA: Si un vehículo falla, log de error y continuar con el siguiente
                logger.error(f"Error procesando placa {plate}: {ve}", exc_info=True)
                conn.rollback()
                continue

        logger.info("=== Proceso de scraping finalizado exitosamente ===")
        return True

    except Exception as e:
        logger.error(f"Error general en ejecución del scraper: {e}", exc_info=True)
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Scraper diario de tenencias y subsidios vehiculares")
    parser.add_argument('--plate', type=str, help="Placa específica a consultar (formato ABC-1234)")
    args = parser.parse_args()

    success = run_scraper(plate_filter=args.plate)
    sys.exit(0 if success else 1)

