import sys

sys.modules["settings"] = __import__("tests")

configuration = {}
configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] = 3000
configuration["ALTITUDE_TOLERANCE_IN_FEET"] = 50
configuration["GROUND_SPEED_TOLERANCE_IN_KNOTS"] = 5
configuration["TRACK_TOLERANCE_IN_DEGREES"] = 2

import sbs_decoder as decoder
import validator

def test_get_flight():
    new_flight = decoder.new_flight
    new_flight["icao"] = "ABC123"
    decoder.flights.append(new_flight)

    assert decoder.get_flight("ABC123")["icao"] == new_flight["icao"]
    assert decoder.get_flight("DEF456")["icao"] == "DEF456"

def test_prepare_value():
    assert decoder.prepare_value(None, None) == None
    assert decoder.prepare_value(None, "ABC123") == "ABC123"
    assert decoder.prepare_value("ABC123", None) == "ABC123"
    assert decoder.prepare_value(None, 2) == 2
    assert decoder.prepare_value(2, None) == 2
    assert decoder.prepare_value(None, 3.4) == 3.4
    assert decoder.prepare_value(3.4, None) == 3.4

def test_is_valid_altitude_instruction():
    assert validator.is_valid_altitude_instruction(configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"])
    assert validator.is_valid_altitude_instruction(configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] + 100)
    assert validator.is_valid_altitude_instruction(configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] + 100.5)
    assert not validator.is_valid_altitude_instruction(configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] - 100)
    assert not validator.is_valid_altitude_instruction(configuration["MINIMUM_DESCENT_ALTITUDE_IN_FEET"] - 100.5)

def test_is_valid_ground_speed_instruction():
    assert validator.is_valid_ground_speed_instruction(0)
    assert validator.is_valid_ground_speed_instruction(200)
    assert validator.is_valid_ground_speed_instruction(200.5)
    assert not validator.is_valid_ground_speed_instruction(-200)
    assert not validator.is_valid_ground_speed_instruction(-200.5)

def test_is_valid_track_instruction():
    assert validator.is_valid_track_instruction(0)
    assert validator.is_valid_track_instruction(20)
    assert validator.is_valid_track_instruction(200)
    assert validator.is_valid_track_instruction(359)
    assert not validator.is_valid_track_instruction(360)
    assert not validator.is_valid_track_instruction(-20)

def test_calculate_track_diff():
    assert validator.calculate_track_diff(2, 8) == 6
    assert validator.calculate_track_diff(200, 282) == 82
    assert validator.calculate_track_diff(2, 182) == 180
    assert validator.calculate_track_diff(2, 202) == 160
    assert validator.calculate_track_diff(2, 357) == 5

def test_validate_altitude():
    assert validator.validate_altitude(4000, 4000)
    assert validator.validate_altitude(3950, 4000)
    assert validator.validate_altitude(4050, 4000)
    assert not validator.validate_altitude(3900, 4000)
    assert not validator.validate_altitude(4100, 4000)

def test_validate_ground_speed():
    assert validator.validate_ground_speed(250, 250)
    assert validator.validate_ground_speed(245, 250)
    assert validator.validate_ground_speed(255, 250)
    assert not validator.validate_ground_speed(240, 250)
    assert not validator.validate_ground_speed(260, 250)

def test_validate_track():
    assert validator.validate_track(1, 1)
    assert validator.validate_track(359, 1)
    assert validator.validate_track(3, 1)
    assert not validator.validate_track(4, 1)
    assert not validator.validate_track(358, 1)