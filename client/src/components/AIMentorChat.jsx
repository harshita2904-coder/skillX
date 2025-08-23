import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

const AIMentorChat = ({ isOpen, onClose }) => {
  const { user } = useSelector(state => state.auth);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      loadWelcomeMessage();
    }
  }, [isOpen, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadWelcomeMessage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://skillx-production-5d56.up.railway.app/dialogflow/welcome/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages([{
          id: Date.now(),
          text: data.text,
          isBot: true,
          timestamp: new Date()
        }]);
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading welcome message:', error);
    }
  };

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: messageText,
      isBot: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://skillx-production-5d56.up.railway.app/dialogflow/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          userId: user._id
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage = {
          id: Date.now() + 1,
          text: data.text,
          isBot: true,
          timestamp: new Date(),
          intent: data.intent,
          skillRecommendations: data.skillRecommendations,
          learningPath: data.learningPath,
          matchSuggestions: data.matchSuggestions
        };

        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        isBot: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">AI Mentor</h3>
                <p className="text-sm opacity-90">Your learning assistant</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.isBot
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                
                {/* Skill Recommendations */}
                {message.skillRecommendations && message.skillRecommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Recommended Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.skillRecommendations.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                                 {/* Learning Path */}
                 {message.learningPath && (
                   <div className="mt-3">
                     <p className="text-xs font-medium text-gray-600 mb-2">Learning Path:</p>
                     <div className="space-y-2">
                       {message.learningPath.map((level, index) => (
                         <div key={index} className="text-xs">
                           <div className="flex items-center justify-between">
                             <span className="font-medium text-indigo-600">{level.level}:</span>
                             <span className="text-gray-500 text-xs">{level.duration}</span>
                           </div>
                           <div className="flex flex-wrap gap-1 mt-1">
                             {level.topics.map((topic, topicIndex) => (
                               <span
                                 key={topicIndex}
                                 className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800"
                               >
                                 {topic}
                               </span>
                             ))}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {/* Progress Analytics */}
                 {message.progressAnalytics && (
                   <div className="mt-3">
                     <p className="text-xs font-medium text-gray-600 mb-2">Your Progress Analytics:</p>
                     <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                       <div className="grid grid-cols-2 gap-2 text-xs">
                         <div>
                           <span className="text-gray-600">Total Skills:</span>
                           <span className="font-medium ml-1">{message.progressAnalytics.totalSkills}</span>
                         </div>
                         <div>
                           <span className="text-gray-600">Skill Diversity:</span>
                           <span className="font-medium ml-1">{message.progressAnalytics.skillDiversity}%</span>
                         </div>
                         <div>
                           <span className="text-gray-600">Learning Velocity:</span>
                           <span className="font-medium ml-1">{message.progressAnalytics.learningVelocity}%</span>
                         </div>
                         <div>
                           <span className="text-gray-600">Profile Complete:</span>
                           <span className="font-medium ml-1">{message.progressAnalytics.profileCompleteness}%</span>
                         </div>
                       </div>
                       {message.progressAnalytics.recommendations && message.progressAnalytics.recommendations.length > 0 && (
                         <div className="mt-2">
                           <p className="text-xs font-medium text-gray-600 mb-1">Recommendations:</p>
                           <ul className="text-xs text-gray-700 space-y-1">
                             {message.progressAnalytics.recommendations.map((rec, index) => (
                               <li key={index} className="flex items-start">
                                 <span className="text-indigo-600 mr-1">•</span>
                                 {rec}
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Skill Demand Analysis */}
                 {message.skillDemand && (
                   <div className="mt-3">
                     <p className="text-xs font-medium text-gray-600 mb-2">Skill Demand Trends:</p>
                     <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                       <div>
                         <p className="text-xs font-medium text-gray-700 mb-1">High Demand Skills:</p>
                         <div className="space-y-1">
                           {message.skillDemand.highDemand.map((skill, index) => (
                             <div key={index} className="flex items-center justify-between text-xs">
                               <span className="font-medium">{skill.skill}</span>
                               <div className="flex items-center space-x-2">
                                 <span className="text-green-600">{skill.demand}%</span>
                                 <span className="text-blue-600">{skill.growth}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                       <div>
                         <p className="text-xs font-medium text-gray-700 mb-1">Market Insights:</p>
                         <ul className="text-xs text-gray-600 space-y-1">
                           {message.skillDemand.marketInsights.map((insight, index) => (
                             <li key={index} className="flex items-start">
                               <span className="text-indigo-600 mr-1">•</span>
                               {insight}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>
                   </div>
                 )}

                 {/* Learning Schedule */}
                 {message.learningSchedule && (
                   <div className="mt-3">
                     <p className="text-xs font-medium text-gray-600 mb-2">Your Learning Schedule:</p>
                     <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                       <div>
                         <p className="text-xs font-medium text-gray-700 mb-2">Weekly Plan:</p>
                         <div className="space-y-1">
                           {message.learningSchedule.weeklyPlan.map((day, index) => (
                             <div key={index} className="flex items-center justify-between text-xs">
                               <span className="font-medium">{day.day}:</span>
                               <div className="flex items-center space-x-2">
                                 <span className="text-gray-600">{day.focus}</span>
                                 <span className="text-indigo-600">{day.time}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                       <div>
                         <p className="text-xs font-medium text-gray-700 mb-1">Monthly Goals:</p>
                         <ul className="text-xs text-gray-600 space-y-1">
                           {message.learningSchedule.monthlyGoals.map((goal, index) => (
                             <li key={index} className="flex items-start">
                               <span className="text-green-600 mr-1">✓</span>
                               {goal}
                             </li>
                           ))}
                         </ul>
                       </div>
                     </div>
                   </div>
                 )}

                {/* Match Suggestions */}
                {message.matchSuggestions && message.matchSuggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-600 mb-2">Suggested Matches:</p>
                    <div className="space-y-2">
                      {message.matchSuggestions.map((match, index) => (
                        <div key={index} className="text-xs bg-white p-2 rounded border">
                          <div className="font-medium">{match.name}</div>
                          <div className="text-gray-600">
                            Skills: {match.skillsTeach.slice(0, 2).join(', ')}
                            {match.skillsTeach.length > 2 && '...'}
                          </div>
                          <div className="text-indigo-600 font-medium">
                            {match.compatibility}% match
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className={`text-xs mt-1 ${
                  message.isBot ? 'text-gray-500' : 'text-indigo-200'
                }`}>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-sm">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && messages.length === 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full hover:bg-indigo-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask your AI mentor..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AIMentorChat; 