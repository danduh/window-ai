import {StrictMode} from 'react';
import * as ReactDOM from 'react-dom/client';

import {BrowserRouter} from "react-router-dom";
import AppRouter from "./app/AppRouter";

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const basename = process.env.NODE_ENV === 'production' ? '/window-ai/' : '/'

root.render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      {/*<App/>*/}
      <AppRouter/>
    </BrowserRouter>
  </StrictMode>
);
