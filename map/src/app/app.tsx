import { Route, Routes } from 'react-router-dom';
import { CrossBorderDesk } from './cross-border-desk/CrossBorderDesk';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CrossBorderDesk />} />
    </Routes>
  );
}

export default App;
