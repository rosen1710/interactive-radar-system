import React, { useContext, useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Bell from "./assets/bell.mp3";
import { Context } from "./Context";

let spectatedFlightIcao = null;
let foundSpectatedFlight = false;

let rememberedWarnings = []

function addWarningInListIfNotRemembered(warningsList, icao, callsign, parameter, requestedValue, rememberTimeInSeconds) {
  let currentDatetime = new Date();

  rememberedWarnings = rememberedWarnings.filter((warningItem) => {
    return currentDatetime - warningItem.datetime < rememberTimeInSeconds * 1000;
  });

  let found = false;

  for (let i = 0; i < rememberedWarnings.length; i++) {
    if (rememberedWarnings[i].icao === icao) {
      if (callsign !== null) {
        rememberedWarnings[i].callsign = callsign;
      }
      if (rememberedWarnings[i].parameter === parameter) {
        rememberedWarnings[i].requestedValue = requestedValue;
        found = true;
      }
    }
  }

  if (!found) {
    warningsList.push({
      icao: icao,
      callsign: callsign,
      parameter: parameter,
      requestedValue: requestedValue,
      datetime: new Date()
    });
  }
}

function useSound(audioSource) {
  const soundRef = useRef();

  useEffect(() => {
    soundRef.current = new Audio(audioSource);
    // eslint-disable-next-line
  }, []);

  const playSound = () => {
    soundRef.current.play();
  };

  const pauseSound = () => {
    soundRef.current.pause();
  };

  return {
    playSound,
    pauseSound,
  };
};

function RadarPage() {
  document.title = "Interactive radar system";

  const context = useContext(Context);

  const mapRef = useRef(null);

  const [flightDetails, setFlightDetails] = useState("");

  const [initialMapLatitude, setInitialMapLatitude] = useState(42.694771);
  const [initialMapLongitude, setInitialMapLongitude] = useState(23.413245);
  const [initialMapZoomLevel, setInitialMapZoomLevel] = useState(8);
  const [flightsUpdateIntervalInSeconds, setFlightsUpdateIntervalInSeconds] = useState(5);
  const [rememberedWarningsIntervalInSeconds, setRememberedWarningsIntervalInSeconds] = useState(60);

  const [flightOptionsDivDisplay, setFlightOptionsDivDisplay] = useState("none");
  const [flightControlsDivDisplay, setFlightControlsDivDisplay] = useState("none");
  const [flightControlsSaveButtonDisplay, setFlightControlsSaveButtonDisplay] = useState("none");
  const [flightControlsReadOnly, setFlightControlsReadOnly] = useState(true);

  const [warningMessageDivDisplay, setWarningMessageDivDisplay] = useState("none");
  const [warningMessageInnerHTML, setWarningMessageInnerHTML] = useState("");

  const [spectatedFlightControllerUser, setSpectatedFlightControllerUser] = useState(null);

  const [instructedAltitude, setInstructedAltitude] = useState("");
  const [instructedSpeed, setInstructedSpeed] = useState("");
  const [instructedTrack, setInstructedTrack] = useState("");

  const playBellSound = useSound(Bell).playSound;

  useEffect(() => {
    hideFlightInfo();
    loadConfiguration();

    // Initialize the map when component mounts
    const map = L.map("map").setView([initialMapLatitude, initialMapLongitude], initialMapZoomLevel);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    }).addTo(map);

    map.on("click", () => {
      hideFlightInfo();
    });

    fetchAndDisplayFlights();

    const intervalId = setInterval(() => {
      fetchAndDisplayFlights();
      context.kc.updateToken(60); // update the token if it expires in the next 60 seconds
    }, flightsUpdateIntervalInSeconds * 1000);

    return () => {
      clearInterval(intervalId);
      map.remove();
    };
    // eslint-disable-next-line
  }, [
    initialMapLatitude,
    initialMapLongitude,
    initialMapZoomLevel,
    flightsUpdateIntervalInSeconds
  ]);

  async function loadConfiguration() {
    let data;
    try {
      data = await (await fetch(`${context.backendAddress}/configuration?token=${context.kc.token}`)).json();
    }
    catch(error) {
      // console.error(error);
      return;
    }
    setInitialMapLatitude(data.configuration.INITIAL_MAP_LATITUDE);
    setInitialMapLongitude(data.configuration.INITIAL_MAP_LONGITUDE);
    setInitialMapZoomLevel(data.configuration.INITIAL_MAP_ZOOM_LEVEL);
    setFlightsUpdateIntervalInSeconds(data.configuration.RADAR_FLIGHTS_UPDATE_TIME_IN_SECONDS);
    setRememberedWarningsIntervalInSeconds(data.configuration.WARNING_REMEMBER_INTERVAL_IN_SECONDS);
  }

  async function fetchAndDisplayFlights() {
    const map = mapRef.current;
    let data;

    try {
      data = await (await fetch(`${context.backendAddress}/flights`)).json();
    }
    catch(error) {
      // console.error(error);

      hideFlightInfo();

      // Clear existing flight markers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          map.removeLayer(layer);
        }
      });
      return;
    }

    // Clear existing flight markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const flights = data.flights;
    foundSpectatedFlight = false;

    let newWarnings = [];

    for (const i in flights) {
      const flight = flights[i];

      if (flight.icao === spectatedFlightIcao) {
        displayFlightInfo(flight);
        foundSpectatedFlight = true;
      }

      // Ensure latitude and longitude are not null
      if (flight.latitude === null || flight.longitude === null) {
        continue;
      }

      let iconUrl = "images/aircraft_marker_solid.png";
      let iconSize = [32, 32];
      // const isGroundVehicle = flight.callsign === "GRND";
      // let iconUrl = isGroundVehicle
      //   ? "images/ground_vehicle_marker.webp"
      //   : "images/aircraft_marker.webp";
      // let iconSize = isGroundVehicle ? [20, 20] : [32, 32];

      if (flight.instructions !== null) {
        let instructionsStatus = "ready";
        let instructionsOwner = "my";
        if (flight.instructions.atc_user_id !== context.kc.subject) {
          instructionsOwner = "other";
        }

        if (flight.instructions.altitude_valid === false) {
          if (new Date() > (new Date(flight.instructions.altitude_due.split("GMT")[0]))) {
            if ((flight.instructions.atc_user_id === context.kc.subject) || (context.kc.hasResourceRole(context.adminUserRole, context.adminUserResource))) {
              addWarningInListIfNotRemembered(newWarnings, flight.icao, flight.callsign, "altitude", `${flight.instructions.altitude} feet`, rememberedWarningsIntervalInSeconds);
            }
            instructionsStatus = "warning";
          }
          else {
            instructionsStatus = "processing";
          }
        }

        if (flight.instructions.ground_speed_valid === false) {
          if (new Date() > (new Date(flight.instructions.ground_speed_due.split("GMT")[0]))) {
            if ((flight.instructions.atc_user_id === context.kc.subject) || (context.kc.hasResourceRole(context.adminUserRole, context.adminUserResource))) {
              addWarningInListIfNotRemembered(newWarnings, flight.icao, flight.callsign, "ground speed", `${flight.instructions.ground_speed} knots`, rememberedWarningsIntervalInSeconds);
            }
            instructionsStatus = "warning";
          }
          else {
            instructionsStatus = "processing";
          }
        }

        if (flight.instructions.track_valid === false) {
          if (new Date() > (new Date(flight.instructions.track_due.split("GMT")[0]))) {
            if ((flight.instructions.atc_user_id === context.kc.subject) || (context.kc.hasResourceRole(context.adminUserRole, context.adminUserResource))) {
              addWarningInListIfNotRemembered(newWarnings, flight.icao, flight.callsign, "track", `${flight.instructions.track}°`, rememberedWarningsIntervalInSeconds);
            }
            instructionsStatus = "warning";
          }
          else {
            instructionsStatus = "processing";
          }
        }
        iconUrl = "images/aircraft_marker_" + instructionsOwner + "_" + instructionsStatus + ".png";
      }

      try {
        const flightMarker = L.marker([flight.latitude, flight.longitude], {
          icon: createRotatedIcon(flight.track, iconUrl, iconSize, `<p class="map-label-below-icon">${(flight.callsign !== null) ? flight.callsign : ""}</p>`),
          title: flight.callsign,
        }).addTo(map);

        // flightMarker.bindPopup(`
        //   <strong>${flight.aircraft_code} ${flight.number}</strong><br>
        //   Callsign: ${flight.callsign}<br>
        //   Altitude: ${flight.altitude} feet
        // `);

        // eslint-disable-next-line
        flightMarker.on("click", () => {
          setFlightControlsSaveButtonDisplay("none");
          displayFlightInfo(flight);

          spectatedFlightIcao = flight.icao;
          foundSpectatedFlight = true;

          if (flight.instructions !== null) {
            if (flight.instructions.altitude !== null) {
              setInstructedAltitude(flight.instructions.altitude);
            }
            else {
              setInstructedAltitude("");
            }
            if (flight.instructions.ground_speed !== null) {
              setInstructedSpeed(flight.instructions.ground_speed);
            }
            else {
              setInstructedSpeed("");
            }
            if (flight.instructions.track !== null) {
              setInstructedTrack(flight.instructions.track);
            }
            else {
              setInstructedTrack("");
            }
          }
        });
      }
      catch(error) {
        // console.error(error);
      }
    }

    if (newWarnings.length > 0 && warningMessageDivDisplay === "none") {
      let warningMessage = "The following warnings are available:<br>";

      newWarnings.forEach(warning => {
        warningMessage += `<br>Flight ${warning.callsign !== null ? warning.callsign : "---"} (${warning.icao}) is not at requested ${warning.parameter} at ${warning.requestedValue}`;
        rememberedWarnings.push(warning);
      });

      bellNotifier(warningMessage);
    }

    if (!foundSpectatedFlight && spectatedFlightIcao) {
      hideFlightInfo();
    }
  };

  function createRotatedIcon(angle, iconUrl, iconSize, htmlAfterIcon) {
    return L.divIcon({
      html: `<img src="${iconUrl}" style="transform: rotate(${angle}deg);" width="${iconSize[0]}" height="${iconSize[1]}"/>${htmlAfterIcon}`,
      iconSize: iconSize,
      iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
      className: "custom-icon",
    });
  };

  async function displayFlightInfo(flight) {
    let imageSrc;
    let imagePhotographer = "";
    let imageLink = "";
    let imageWidth = 0;
    let imageHeight = 0;
    try {
      imageSrc = await (await fetch(`https://api.planespotters.net/pub/photos/hex/${flight.icao}`)).json();
      imageSrc = imageSrc.photos[0];
      imagePhotographer = "© " + imageSrc.photographer;
      imageLink = imageSrc.link;
      if (imageSrc.thumbnail_large !== undefined) {
        imageWidth = imageSrc.thumbnail_large.size.width;
        imageHeight = imageSrc.thumbnail_large.size.height;
        imageSrc = imageSrc.thumbnail_large.src;
      }
      else {
        imageWidth = imageSrc.thumbnail.size.width;
        imageHeight = imageSrc.thumbnail.size.height;
        imageSrc = imageSrc.thumbnail.src;
      }
    } catch (error) {
      imageSrc = "";
      imagePhotographer = "";
      imageLink = "";
      imageWidth = 0;
      imageHeight = 0;
      // console.error(error);
    }
    let imageShowHeight = 180;
    setFlightDetails(`
      <div style="height: 100%; margin-right: 10px">
        <img style="height: ${imageShowHeight}px" src="${imageSrc}"></img>
        <br>
        <a style="margin: 0" target="_blank" href="${imageLink}">
          <p style="margin: 0; max-width: ${(imageWidth * imageShowHeight) / imageHeight}px; word-wrap: break-word">${imagePhotographer}</p>
        </a>
      </div>
      <div style="height: 100%">
        ICAO: <strong>${flight.icao}</strong><br>
        Callsign: ${(flight.callsign !== null) ? flight.callsign : "---"}<br><br>
        Altitude: ${(flight.altitude !== null) ? flight.altitude : "---"} feet<br>
        Speed: ${(flight.ground_speed !== null) ? flight.ground_speed : "---"} knots<br>
        Track: ${(flight.track !== null) ? flight.track : "---"}°
      </div>
    `);

    if (flight.instructions !== null) {
      if (flight.instructions.atc_user_id === context.kc.subject) {
        setSpectatedFlightControllerUser(flight.instructions.atc_user_id);
        setFlightControlsReadOnly(false);
        setFlightControlsDivDisplay("block");
      }
      else {
        setSpectatedFlightControllerUser(flight.instructions.atc_user_fullname);
        setFlightControlsReadOnly(true);

        setInstructedAltitude(flight.instructions.altitude);
        setInstructedSpeed(flight.instructions.ground_speed);
        setInstructedTrack(flight.instructions.track);

        setFlightControlsDivDisplay("block");
      }
    }
    else {
      setSpectatedFlightControllerUser(null);
      setFlightControlsDivDisplay("none");

      setInstructedAltitude("");
      setInstructedSpeed("");
      setInstructedTrack("");
    }
    setFlightOptionsDivDisplay("block");
  };

  function hideFlightInfo() {
    setFlightOptionsDivDisplay("none");
    setFlightDetails("");
    spectatedFlightIcao = null;
  };

  function bellNotifier(messageInnerHTML) {
    if (navigator.userActivation.hasBeenActive) {
      playBellSound();
    }
    setWarningMessageInnerHTML(messageInnerHTML);
    setWarningMessageDivDisplay("block");
  };

  async function controlFlight(instructions = undefined) {
    try {
      let jsonBody = {};
      jsonBody.token = context.kc.token;

      if (instructions !== undefined) {
        jsonBody.altitude = instructions.altitude;
        jsonBody.ground_speed = instructions.ground_speed;
        jsonBody.track = instructions.track;
      }

      let response = await fetch(`${context.backendAddress}/instructions/${spectatedFlightIcao}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonBody)
      });

      if (response.status === 200) {
        setFlightControlsSaveButtonDisplay("none");
      }
      else if (response.status === 400) {
        let data = await response.json();

        bellNotifier(data.message);
      }
      fetchAndDisplayFlights();
    } catch (error) {
      // console.error(error);
    }
  }

  async function stopControllingFlight() {
    try {
      await fetch(`${context.backendAddress}/instructions/${spectatedFlightIcao}/${context.kc.token}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        }
      });

      fetchAndDisplayFlights();
    } catch (error) {
      // console.error(error);
    }
  }

  return (
    <div className="container">
      <div className="navbar">
        {context.kc.hasResourceRole(context.adminUserRole, context.adminUserResource) ? (
          <div>
            <Link to="/settings">Manage system settings</Link>
            <a href={`${context.kcOptions.url}admin/${context.kcOptions.realm}/console/#/${context.kcOptions.realm}/users`} target="_blank" rel="noreferrer" style={{ marginLeft: "10px" }}>Manage system users</a>
          </div>
        ) : null}
        <a href={`${context.kcOptions.url}realms/${context.kcOptions.realm}/account`} target="_blank" rel="noreferrer" style={{ marginLeft: "10px" }}>Manage your account</a>
        <button onClick={() => context.kc.logout()} style={{ marginLeft: "10px" }}>Logout</button>
      </div>
      <div id="map"></div>
      <h2 style={{ margin: "10px", paddingTop: "5px", borderTop: "1px solid #ccc" }}>Flight Information</h2>
      <div id="flight-info">
        <div id="flight-details" dangerouslySetInnerHTML={{ __html: flightDetails }}></div>
        <div id="flight-options" style={{ display: flightOptionsDivDisplay }}>
          { spectatedFlightControllerUser === null ? (
            <button className="control-flight-button" onClick={controlFlight}>Control this flight</button>
          ) : spectatedFlightControllerUser === context.kc.subject ? (
            <button className="control-flight-button" onClick={stopControllingFlight} style={{ marginBottom: "34px" }}>Stop controlling this flight</button>
          ) : (
            <p className="controlled-by-label">This flight is controlled by: {spectatedFlightControllerUser}</p>
          )}
          <div id="flight-controls" style={{ display: flightControlsDivDisplay }}>
            <input type="number" value={instructedAltitude} readOnly={flightControlsReadOnly} onChange={(e) => {setInstructedAltitude(e.target.value); setFlightControlsSaveButtonDisplay("block")}} style={{ height: "14px", width: "100px" }}/>
            <button onClick={() => {if (instructedAltitude !== "") {setInstructedAltitude(""); setFlightControlsSaveButtonDisplay("block")}}} style={{ display: flightControlsReadOnly ? "none" : "inline-block", height: "18px", position: "relative", "top": "1px" }}>x</button> feet
            <br/>
            <input type="number" value={instructedSpeed} readOnly={flightControlsReadOnly} onChange={(e) => {setInstructedSpeed(e.target.value); setFlightControlsSaveButtonDisplay("block")}} style={{ height: "14px", width: "100px" }}/>
            <button onClick={() => {if (instructedSpeed !== "") {setInstructedSpeed(""); setFlightControlsSaveButtonDisplay("block")}}} style={{ display: flightControlsReadOnly ? "none" : "inline-block", height: "18px", position: "relative", "top": "1px" }}>x</button> knots
            <br/>
            <input type="number" value={instructedTrack} readOnly={flightControlsReadOnly} onChange={(e) => {setInstructedTrack(e.target.value); setFlightControlsSaveButtonDisplay("block")}} style={{ height: "14px", width: "100px" }}/>
            <button onClick={() => {if (instructedTrack !== "") {setInstructedTrack(""); setFlightControlsSaveButtonDisplay("block")}}} style={{ display: flightControlsReadOnly ? "none" : "inline-block", height: "18px", position: "relative", "top": "1px" }}>x</button> °
            <br/>
            <button onClick={() => controlFlight({altitude: instructedAltitude, ground_speed: instructedSpeed, track: instructedTrack})} style={{ display: flightControlsSaveButtonDisplay }}>Save</button>
          </div>
        </div>
      </div>
      <div id="warning-message-container" style={{ display: warningMessageDivDisplay, position: "fixed", top: "55%", left: "5%", width: "90%", height: "40%", borderRadius: "20px", backgroundColor: "#ded0ab" }}>
        <h1 style={{ margin: "20px", textAlign: "center" }}>Warning</h1>
        <div id="warning-message-text" dangerouslySetInnerHTML={{ __html: warningMessageInnerHTML }} style={{ margin: "20px", height: "45%", overflowY: "auto" }}></div>
        <button onClick={() => {setWarningMessageDivDisplay("none")}} style={{ position: "fixed", bottom: "8%", left: "45%", width: "10%" }}>OK</button>
      </div>
    </div>
  );
}

export default RadarPage;
