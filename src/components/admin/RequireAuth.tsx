import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdminSession } from '../../lib/adminClient';

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const location = useLocation();
  const sessao = getAdminSession();

  if (!sessao) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};
