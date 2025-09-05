import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/config';

const Admin = () => {
  const { user } = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  
  // Form states
  const [testForm, setTestForm] = useState({
    title: '',
    skill: '',
    description: '',
    starterCode: '',
    language: 'javascript',
    points: 10,
    difficulty: 'easy',
    testCases: [{ input: '', output: '', description: '' }]
  });

  useEffect(() => {
    if (user?.email !== 'admin@skillx.com') {
      navigate('/dashboard');
      return;
    }
    fetchTests();
    fetchStats();
  }, [user, navigate]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/tests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/tests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testForm)
      });

      if (response.ok) {
        alert('Test created successfully!');
        setTestForm({
          title: '',
          skill: '',
          description: '',
          starterCode: '',
          language: 'javascript',
          points: 10,
          difficulty: 'easy',
          testCases: [{ input: '', output: '', description: '' }]
        });
        fetchTests();
      }
    } catch (error) {
      console.error('Error creating test:', error);
      alert('Error creating test');
    }
  };

  const addTestCase = () => {
    setTestForm(prev => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', output: '', description: '' }]
    }));
  };

  const removeTestCase = (index) => {
    setTestForm(prev => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== index)
    }));
  };

  const updateTestCase = (index, field, value) => {
    setTestForm(prev => ({
      ...prev,
      testCases: prev.testCases.map((tc, i) => 
        i === index ? { ...tc, [field]: value } : tc
      )
    }));
  };

  const toggleTestStatus = async (testId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/tests/${testId}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Error toggling test status:', error);
    }
  };

  const deleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/admin/tests/${testId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchTests();
      }
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  if (user?.email !== 'admin@skillx.com') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600">Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage tests and view platform statistics</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tests'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manage Tests
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Create Test
            </button>
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Tests</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalTests || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Tests</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.activeTests || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Submissions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalSubmissions || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Tests Tab */}
        {activeTab === 'tests' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Manage Tests</h3>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {tests.map((test) => (
                    <div key={test._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{test.title}</h4>
                          <p className="text-sm text-gray-500">{test.skill} • {test.points} points</p>
                          <p className="text-sm text-gray-500">Difficulty: {test.difficulty}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            test.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {test.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            onClick={() => toggleTestStatus(test._id)}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            {test.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteTest(test._id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Test Tab */}
        {activeTab === 'create' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Create New Test</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={testForm.title}
                    onChange={(e) => setTestForm(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Skill</label>
                  <input
                    type="text"
                    value={testForm.skill}
                    onChange={(e) => setTestForm(prev => ({ ...prev, skill: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Language</label>
                  <select
                    value={testForm.language}
                    onChange={(e) => setTestForm(prev => ({ ...prev, language: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    value={testForm.difficulty}
                    onChange={(e) => setTestForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Points</label>
                  <input
                    type="number"
                    value={testForm.points}
                    onChange={(e) => setTestForm(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={testForm.description}
                  onChange={(e) => setTestForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text_sm font-medium text-gray-700">Starter Code</label>
                <textarea
                  value={testForm.starterCode}
                  onChange={(e) => setTestForm(prev => ({ ...prev, starterCode: e.target.value }))}
                  rows={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-700">Test Cases</label>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Add Test Case
                  </button>
                </div>
                <div className="space-y-4">
                  {testForm.testCases.map((testCase, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Test Case {index + 1}</h4>
                        {testForm.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Input</label>
                          <input
                            type="text"
                            value={testCase.input}
                            onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Expected Output</label>
                          <input
                            type="text"
                            value={testCase.output}
                            onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline_none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <input
                            type="text"
                            value={testCase.description}
                            onChange={(e) => updateTestCase(index, 'description', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline_none focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Test
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin; 