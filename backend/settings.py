import os, time
from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from models import *

RAW_IN_DEFAULT_PORT = 30002
SBS_DEFAULT_PORT = 30003

load_dotenv()

configuration = {}

configuration["FLIGHT_DATA_INPUT_MODE"] = "sbs" # os.getenv("FLIGHT_DATA_INPUT_MODE") # "raw-in" or "sbs"
configuration["FLIGHT_DATA_HOST"] = os.getenv("FLIGHT_DATA_HOST")
configuration["FLIGHT_DATA_PORT"] = int(os.getenv("FLIGHT_DATA_PORT")) # 0 means the default port for the selected input mode

configuration["INITIAL_MAP_LATITUDE"] = 42.694771
configuration["INITIAL_MAP_LONGITUDE"] = 23.413245
configuration["INITIAL_MAP_ZOOM_LEVEL"] = 8

configuration["RADAR_FLIGHTS_UPDATE_TIME_IN_SECONDS"] = 5

configuration["MAX_FLIGHT_UPDATE_INTERVAL_BEFORE_CONSIDERED_AS_LOST_IN_SECONDS"] = 10

configuration["INSTRUCTION_VALIDITY_TIME_AFTER_FLIGHT_IS_LOST_IN_SECONDS"] = 1800 # 30 minutes

configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] = 3000

configuration["MAX_TIME_FOR_100_FT_ALTITUDE_CHANGE_IN_SECONDS"] = 30
configuration["ALTITUDE_TOLERANCE_IN_FEET"] = 50

configuration["MAX_TIME_FOR_10_KNOTS_GROUND_SPEED_CHANGE_IN_SECONDS"] = 20
configuration["GROUND_SPEED_TOLERANCE_IN_KNOTS"] = 5

configuration["MAX_TIME_FOR_10_DEGREES_TRACK_CHANGE_IN_SECONDS"] = 20
configuration["TRACK_TOLERANCE_IN_DEGREES"] = 2

configuration["WARNING_REMEMBER_INTERVAL_IN_SECONDS"] = 60

configuration["LOG_ALL_AIRCRAFT_MESSAGES"] = 0 # 0 means False, 1 means True

def load_settings():
    global configuration
    with Session(db_engine) as session:
        saved_settings = list(session.scalars(select(Configuration)))

        all_keys = [element.key for element in saved_settings]
        all_values = [element.value for element in saved_settings]

        for setting_key in configuration.keys():
            if setting_key in all_keys:
                configuration[setting_key] = all_values[all_keys.index(setting_key)]

                try:
                    configuration[setting_key] = float(configuration[setting_key])
                    if configuration[setting_key] == int(configuration[setting_key]):
                        configuration[setting_key] = int(configuration[setting_key])
                except:
                    pass
            else:
                session.add(Configuration(setting_key, configuration[setting_key]))

        session.commit()

db_engine = create_engine(f"postgresql+psycopg2://{os.getenv('POSTGRES_USER')}:{os.getenv('POSTGRES_PASSWORD')}@{os.getenv('POSTGRES_DB_HOST')}:{os.getenv('POSTGRES_DB_PORT')}/{os.getenv('POSTGRES_DB')}")

while True:
    try:
        Base.metadata.create_all(db_engine) # Creates all tables that don't exist in the database
        print("Connection to database was successfully established and all tables were created or already exist.")
        break
    except:
        print("Failed to connect to database. Retrying in 2 seconds...")
        time.sleep(2)

load_settings()