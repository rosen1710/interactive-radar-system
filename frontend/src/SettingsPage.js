import { useContext, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Context } from "./Context";

function SettingsPage() {
  document.title = "Settings | Interactive radar system";

  const context = useContext(Context);

  const [flightDataDecoderHost, setFlightDataDecoderHost] = useState();
  const [flightDataDecoderPort, setFlightDataDecoderPort] = useState();
  const [initialMapLatitude, setInitialMapLatitude] = useState();
  const [initialMapLongitude, setInitialMapLongitude] = useState();
  const [initialMapZoomLevel, setInitialMapZoomLevel] = useState();
  const [radarFlightsUpdateTimeInSeconds, setRadarFlightsUpdateTimeInSeconds] = useState();
  const [maxUpdateIntervalBeforeConsideredAsLost, setMaxUpdateIntervalBeforeConsideredAsLost] = useState();
  const [instructionValidityTimeAfterFlightIsLost, setInstructionValidityTimeAfterFlightIsLost] = useState();
  const [minimumDescentAltitudeInFeet, setMinimumDescentAltitudeInFeet] = useState();
  const [maxTimeFor100FtAltitudeChangeInSeconds, setMaxTimeFor100FtAltitudeChangeInSeconds] = useState();
  const [altitudeToleranceInFeet, setAltitudeToleranceInFeet] = useState();
  const [maxTimeFor10KnotsGroundSpeedChangeInSeconds, setMaxTimeFor10KnotsGroundSpeedChangeInSeconds] = useState();
  const [groundSpeedToleranceInKnots, setGroundSpeedToleranceInKnots] = useState();
  const [maxTimeFor10DegreesTrackChangeInSeconds, setMaxTimeFor10DegreesTrackChangeInSeconds] = useState();
  const [trackToleranceInDegrees, setTrackToleranceInDegrees] = useState();
  const [warningRememberIntervalInSeconds, setWarningRememberIntervalInSeconds] = useState();
  const [logAllAircraftMessages, setLogAllAircraftMessages] = useState();

  useEffect(() => {
    loadConfiguration();

    const intervalId = setInterval(() => {
      context.kc.updateToken(60); // update the token if it expires in the next 60 seconds
    }, 30000); // check once at every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line
  }, []);

  async function loadConfiguration() {
    let data;
    try {
      data = await (await fetch(`${context.backendAddress}/configuration?token=${context.kc.token}`)).json();
    }
    catch(error) {
      // console.error(error);
      return;
    }
    setFlightDataDecoderHost(data.configuration.FLIGHT_DATA_HOST);
    setFlightDataDecoderPort(data.configuration.FLIGHT_DATA_PORT);
    setInitialMapLatitude(data.configuration.INITIAL_MAP_LATITUDE);
    setInitialMapLongitude(data.configuration.INITIAL_MAP_LONGITUDE);
    setInitialMapZoomLevel(data.configuration.INITIAL_MAP_ZOOM_LEVEL);
    setRadarFlightsUpdateTimeInSeconds(data.configuration.RADAR_FLIGHTS_UPDATE_TIME_IN_SECONDS);
    setMaxUpdateIntervalBeforeConsideredAsLost(data.configuration.MAX_FLIGHT_UPDATE_INTERVAL_BEFORE_CONSIDERED_AS_LOST_IN_SECONDS);
    setInstructionValidityTimeAfterFlightIsLost(data.configuration.INSTRUCTION_VALIDITY_TIME_AFTER_FLIGHT_IS_LOST_IN_SECONDS);
    setMinimumDescentAltitudeInFeet(data.configuration.MINIMUM_DESCENT_ALTITUDE_IN_FEET);
    setMaxTimeFor100FtAltitudeChangeInSeconds(data.configuration.MAX_TIME_FOR_100_FT_ALTITUDE_CHANGE_IN_SECONDS);
    setAltitudeToleranceInFeet(data.configuration.ALTITUDE_TOLERANCE_IN_FEET);
    setMaxTimeFor10KnotsGroundSpeedChangeInSeconds(data.configuration.MAX_TIME_FOR_10_KNOTS_GROUND_SPEED_CHANGE_IN_SECONDS);
    setGroundSpeedToleranceInKnots(data.configuration.GROUND_SPEED_TOLERANCE_IN_KNOTS);
    setMaxTimeFor10DegreesTrackChangeInSeconds(data.configuration.MAX_TIME_FOR_10_DEGREES_TRACK_CHANGE_IN_SECONDS);
    setTrackToleranceInDegrees(data.configuration.TRACK_TOLERANCE_IN_DEGREES);
    setWarningRememberIntervalInSeconds(data.configuration.WARNING_REMEMBER_INTERVAL_IN_SECONDS);
    setLogAllAircraftMessages(data.configuration.LOG_ALL_AIRCRAFT_MESSAGES);
  }

  async function saveConfiguration() {
    try {
      let response = await fetch(`${context.backendAddress}/configuration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "token": context.kc.token,
          "FLIGHT_DATA_HOST": flightDataDecoderHost,
          "FLIGHT_DATA_PORT": flightDataDecoderPort,
          "INITIAL_MAP_LATITUDE": initialMapLatitude,
          "INITIAL_MAP_LONGITUDE": initialMapLongitude,
          "INITIAL_MAP_ZOOM_LEVEL": initialMapZoomLevel,
          "RADAR_FLIGHTS_UPDATE_TIME_IN_SECONDS": radarFlightsUpdateTimeInSeconds,
          "MAX_FLIGHT_UPDATE_INTERVAL_BEFORE_CONSIDERED_AS_LOST_IN_SECONDS": maxUpdateIntervalBeforeConsideredAsLost,
          "INSTRUCTION_VALIDITY_TIME_AFTER_FLIGHT_IS_LOST_IN_SECONDS": instructionValidityTimeAfterFlightIsLost,
          "MINIMUM_DESCENT_ALTITUDE_IN_FEET": minimumDescentAltitudeInFeet,
          "MAX_TIME_FOR_100_FT_ALTITUDE_CHANGE_IN_SECONDS": maxTimeFor100FtAltitudeChangeInSeconds,
          "ALTITUDE_TOLERANCE_IN_FEET": altitudeToleranceInFeet,
          "MAX_TIME_FOR_10_KNOTS_GROUND_SPEED_CHANGE_IN_SECONDS": maxTimeFor10KnotsGroundSpeedChangeInSeconds,
          "GROUND_SPEED_TOLERANCE_IN_KNOTS": groundSpeedToleranceInKnots,
          "MAX_TIME_FOR_10_DEGREES_TRACK_CHANGE_IN_SECONDS": maxTimeFor10DegreesTrackChangeInSeconds,
          "TRACK_TOLERANCE_IN_DEGREES": trackToleranceInDegrees,
          "WARNING_REMEMBER_INTERVAL_IN_SECONDS": warningRememberIntervalInSeconds,
          "LOG_ALL_AIRCRAFT_MESSAGES": logAllAircraftMessages
        })
      });

      if (response.status === 200) {
        alert("The configuration was updated successfully!");
      }
    }
    catch(error) {
      // console.error(error);
      alert("An error occurred while updating configuration.\n\nYou can try to do it again.");
    }
    loadConfiguration();
  }

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "right", margin: "10px" }}>
        <Link to="/">Back to Radar Page</Link>
        {context.kc.hasResourceRole(context.adminUserRole, context.adminUserResource) ? (
          <div>
            <a href={`${context.kcOptions.url}admin/${context.kcOptions.realm}/console/#/${context.kcOptions.realm}/users`} target="_blank" rel="noreferrer" style={{ marginLeft: "10px" }}>Manage system users</a>
          </div>
        ) : null}
        <a href={`${context.kcOptions.url}realms/${context.kcOptions.realm}/account`} target="_blank" rel="noreferrer" style={{ marginLeft: "10px" }}>Manage your account</a>
        <button onClick={() => context.kc.logout()} style={{ marginLeft: "10px" }}>Logout</button>
      </div>
      <h1>System settings</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", marginTop: "50px" }}>
        <p className="settings-label">Set initial map latitude:</p>
        <input type="number" value={initialMapLatitude} onChange={(e) => setInitialMapLatitude(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set initial map longitude:</p>
        <input type="number" value={initialMapLongitude} onChange={(e) => setInitialMapLongitude(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set initial map zoom level:</p>
        <input type="number" value={initialMapZoomLevel} onChange={(e) => setInitialMapZoomLevel(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set flights update time in seconds:</p>
        <input type="number" value={radarFlightsUpdateTimeInSeconds} onChange={(e) => setRadarFlightsUpdateTimeInSeconds(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum time interval between two messages before flight considered as lost:</p>
        <input type="number" value={maxUpdateIntervalBeforeConsideredAsLost} onChange={(e) => setMaxUpdateIntervalBeforeConsideredAsLost(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set instruction validity time after flight is lost in seconds:</p>
        <input type="number" value={instructionValidityTimeAfterFlightIsLost} onChange={(e) => setInstructionValidityTimeAfterFlightIsLost(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set Minimum Descent Altitude (MDA) in feet:</p>
        <input type="number" value={minimumDescentAltitudeInFeet} onChange={(e) => setMinimumDescentAltitudeInFeet(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum time for every 100 ft altitude change in seconds:</p>
        <input type="number" value={maxTimeFor100FtAltitudeChangeInSeconds} onChange={(e) => setMaxTimeFor100FtAltitudeChangeInSeconds(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum altitude tolerance in feet:</p>
        <input type="number" value={altitudeToleranceInFeet} onChange={(e) => setAltitudeToleranceInFeet(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum time for every 10 knots ground speed change in seconds:</p>
        <input type="number" value={maxTimeFor10KnotsGroundSpeedChangeInSeconds} onChange={(e) => setMaxTimeFor10KnotsGroundSpeedChangeInSeconds(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum ground speed tolerance in knots:</p>
        <input type="number" value={groundSpeedToleranceInKnots} onChange={(e) => setGroundSpeedToleranceInKnots(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum time for every 10 degrees track change in seconds:</p>
        <input type="number" value={maxTimeFor10DegreesTrackChangeInSeconds} onChange={(e) => setMaxTimeFor10DegreesTrackChangeInSeconds(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set maximum track tolerance in degrees:</p>
        <input type="number" value={trackToleranceInDegrees} onChange={(e) => setTrackToleranceInDegrees(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set warning remember interval in seconds:</p>
        <input type="number" value={warningRememberIntervalInSeconds} onChange={(e) => setWarningRememberIntervalInSeconds(e.target.value)} className="settings-input"/>
        <div className="page-delimiter"></div>
        <div className="page-delimiter"></div>
        <p className="settings-label">Set flight data decoder host:</p>
        <input type="text" value={flightDataDecoderHost} onChange={(e) => setFlightDataDecoderHost(e.target.value)} className="settings-input"/>
        <p className="settings-label">Set flight data decoder port (or 0 to keep the dafault port):</p>
        <input type="number" value={flightDataDecoderPort} onChange={(e) => setFlightDataDecoderPort(e.target.value)} className="settings-input"/>
        <p className="settings-label">Log all received aircraft messages:</p>
        <input type="checkbox" checked={logAllAircraftMessages} onChange={(e) => {e.target.checked ? setLogAllAircraftMessages(1) : setLogAllAircraftMessages(0)}} className="settings-checkbox"/>
      </div>
      <button onClick={saveConfiguration} style={{ margin: "40px" }}>Save</button>
    </div>
  );
}

export default SettingsPage;
