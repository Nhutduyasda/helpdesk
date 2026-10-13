// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';
import { demoMode } from '@/integrations/supabase/client';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const ItLayout = Loadable(lazy(() => import('../views/itcare/ItLayout')));
const CareLogin = Loadable(lazy(() => import('../views/itcare/Login')));
const PublicReport = Loadable(lazy(() => import('../views/itcare/PublicReport')));
const Inbox = Loadable(lazy(() => import('../views/itcare/Desktop')));
const Details = Loadable(lazy(() => import('../views/itcare/Desktop').then(m => ({ default: m.Details }))));
const Staff = Loadable(lazy(() => import('../views/itcare/Desktop').then(m => ({ default: m.Staff }))));


// dashboards

const ModernDashboard = Loadable(lazy(() => import('../views/dashboards/modern')));

const Error = Loadable(lazy(() => import('../views/auth/error')));

//apps
const Blog = Loadable(lazy(() => import('../views/apps/blog/post')));
const BlogDetail = Loadable(lazy(() => import('../views/apps/blog/detail')));
const BlogAdd = Loadable(lazy(() => import('../views/apps/blog/create')));
const BlogEdit = Loadable(lazy(() => import('../views/apps/blog/edit')));
const BlogTable = Loadable(lazy(() => import('../views/apps/blog/manage-blog')));

const Notes = Loadable(lazy(() => import('../views/apps/notes')));

const Tickets = Loadable(lazy(() => import('../views/apps/tickets')));
const TicketCreate = Loadable(lazy(() => import('../views/apps/tickets/create')));

// pages
const TablesPage = Loadable(lazy(() => import('../views/pages/tables')));
const FormPage = Loadable(lazy(() => import('../views/pages/form')));
const UserProfilePage = Loadable(lazy(() => import('../views/pages/user-profile')));

//icons
const SolarIcon = Loadable(lazy(() => import('../views/icons/iconify')));

// authentication

const Login2 = Loadable(lazy(() => import('../views/auth/auth2/login')));

const Register2 = Loadable(lazy(() => import('../views/auth/auth2/register')));

const ForgotPassword2 = Loadable(lazy(() => import('../views/auth/auth2/forgot-password')));

const TwoSteps2 = Loadable(lazy(() => import('../views/auth/auth2/two-steps')));

const Maintainance = Loadable(lazy(() => import('../views/auth/maintenance')));

const Router = [
  { path: '/', element: <PublicReport /> },
  { path: '/report', element: <PublicReport /> },
  { path: '/login', element: <Navigate to='/report' replace /> },
  { path: '/employee/*', element: <Navigate to='/report' replace /> },
  { path: '/it/login', element: <CareLogin /> },
  { path: '/it', element: <ItLayout />, children: [
    { index: true, element: <Navigate to="/it/inbox" replace /> },
    { path: 'inbox', element: <Inbox /> },
    { path: 'history', element: <Inbox /> },
    { path: 'tickets/:id', element: <Details /> },
    { path: 'employees', element: <Staff /> },
  ] },
  ...(import.meta.env.DEV && demoMode ? [{
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/login" replace /> },

      { path: '/dashboards/modern', element: <ModernDashboard /> },

      { path: '/apps/blog/post', element: <Blog /> },
      { path: '/apps/blog/detail/:id', element: <BlogDetail /> },
      { path: '/apps/blog/create', element: <BlogAdd /> },
      { path: '/apps/blog/edit', element: <BlogEdit /> },
      { path: '/apps/blog/manage-blog', element: <BlogTable /> },

      { path: '/apps/notes', element: <Notes /> },

      { path: '/apps/tickets', element: <Tickets /> },
      { path: '/apps/tickets/create', element: <TicketCreate /> },

      { path: '/pages/tables', element: <TablesPage /> },
      { path: '/pages/form', element: <FormPage /> },
      { path: '/pages/user-profile', element: <UserProfilePage /> },

      { path: '/icons/iconify', element: <SolarIcon /> },

    
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/auth2/login', element: <Login2 /> },

      { path: '/auth/auth2/register', element: <Register2 /> },

      { path: '/auth/auth2/forgot-password', element: <ForgotPassword2 /> },

      { path: '/auth/auth2/two-steps', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintainance /> },
      { path: '404', element: <Error /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
] : []),
  { path: '*', element: <Navigate to='/report' replace /> },
];

const router = createBrowserRouter(Router);

export default router;
