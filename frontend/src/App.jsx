import { Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegistrationPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import  HeadDashboard  from './pages/HeadDashboard';
import  TreasurerDashboard from './pages/TreasurerDashboard';
import PropertyManagerDashboard  from './pages/PropertyManagerDashboard';
import  EventCoordinatorDashboard  from './pages/EventCoordinatorDashboard';
import  MembersDashboard  from './pages/MembersDashboard';
import Header from './components/Header';
import EventSchedulerPage from './pages/EventSchedulerPage';

export const App = () => {
  return (
    <>    <Header/>
    <Routes>
      <Route path="/:edirslug/login" element={<LoginPage />} />
      <Route path="/:edirslug/register" element={<RegisterPage />} />


      <Route path="/pending-approval" element={<PendingApprovalPage />} />
      <Route path="/:edirslug/head/dashboard" element={<HeadDashboard />} />
      <Route path="/:edirslug/head/events" element={<EventSchedulerPage />} />

      <Route path="/:edirslug/treasurer/dashboard" element={<TreasurerDashboard />} />

      <Route path="/:edirslug/propertymanager/dashboard" element={<PropertyManagerDashboard />} />
      <Route path="/:edirslug/eventcoordinator/dashboard" element={<EventCoordinatorDashboard />} />
      <Route path="/:edirslug/member/dashboard" element={<MembersDashboard />} /> 
    </Routes>
    </>

  );
};  