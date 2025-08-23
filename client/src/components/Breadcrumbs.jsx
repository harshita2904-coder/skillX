import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Breadcrumbs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter(x => x);
    const breadcrumbs = [];

    if (pathnames.length === 0) {
      return [{ name: 'Dashboard', path: '/dashboard', current: true }];
    }

    let currentPath = '';
    pathnames.forEach((name, index) => {
      currentPath += `/${name}`;
      const isLast = index === pathnames.length - 1;
      
      // Convert path to readable name
      let displayName = name.charAt(0).toUpperCase() + name.slice(1);
      
      // Special cases
      if (name === 'matches') displayName = 'Matches';
      if (name === 'tests') displayName = 'Skill Tests';
      if (name === 'profile') displayName = 'Profile';
      if (name === 'admin') displayName = 'Admin Panel';
      if (name === 'chat') displayName = 'Chat';
      if (name === 'video') displayName = 'Video Call';

      breadcrumbs.push({
        name: displayName,
        path: currentPath,
        current: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-4">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path}>
            <div className="flex items-center">
              {index > 0 && (
                <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {breadcrumb.current ? (
                <span className="ml-4 text-sm font-medium text-gray-500" aria-current="page">
                  {breadcrumb.name}
                </span>
              ) : (
                <button
                  onClick={() => navigate(breadcrumb.path)}
                  className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {breadcrumb.name}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs; 