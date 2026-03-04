import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Leaderboard from './pages/Leaderboard';
import Admin from './pages/Admin';
import { QuizProvider } from './context/QuizContext';
import Sidebar from './components/Sidebar';
import WrongAnswers from './pages/WrongAnswers';
import Summary from './pages/Summary';
import Diary from './pages/Diary';
import Community from './pages/Community';
import Store from './pages/Store';
import PhotoProof from './pages/PhotoProof';

function AppLayout() {
  const location = useLocation();
  const isWideLayout = location.pathname.startsWith('/summary');

  return (
    <div className="min-h-screen bg-transparent font-sans px-2 py-2 md:px-4 md:py-4">
      <main
        className={`w-full mx-auto min-h-screen bg-white relative rounded-[32px] md:rounded-[40px] shadow-[var(--qt-soft-shadow)] overflow-hidden ${isWideLayout ? 'max-w-5xl' : 'max-w-md'
          }`}
      >
        <Sidebar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz/:weekId" element={<Quiz />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/wrong-answers" element={<WrongAnswers />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/community" element={<Community />} />
          <Route path="/store" element={<Store />} />
          <Route path="/photo-proof" element={<PhotoProof />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QuizProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QuizProvider>
  );
}

export default App;
