import { BrowserRouter, Routes, Route } from "react-router-dom";
import Keycloak from "keycloak-js";
import RadarPage from "./RadarPage";
import SettingsPage from "./SettingsPage";
import { Context } from "./Context";

let context = {}

context.backendAddress = process.env.REACT_APP_BACKEND_ADDRESS;

context.adminUserRole = process.env.REACT_APP_ADMIN_USER_ROLE;
context.adminUserResource = process.env.REACT_APP_ADMIN_USER_RESOURCE;

context.kcOptions = {
  url: process.env.REACT_APP_KEYCLOAK_URL,
  realm: process.env.REACT_APP_KEYCLOAK_REALM,
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID
}

context.kc = new Keycloak(context.kcOptions);

await context.kc.init({
  onLoad: 'login-required', // Supported values: 'check-sso' (default), 'login-required'
});
// console.log(context.kc.token);

// Doing this check because after that we need to be sure that the link ends with "/"
if (String(context.kcOptions.url).charAt(String(context.kcOptions.url).length - 1) !== "/") {
  context.kcOptions.url += "/";
}

function App() {
  return (
    <Context.Provider value={context}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RadarPage/>}/>
          <Route path="/settings" element={<SettingsPage/>}/>
        </Routes>
      </BrowserRouter>
    </Context.Provider>
  );
}

export default App;
