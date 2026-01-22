import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Ticket, EventParticipant } from '../store/useStore';
import { Shield, Users, Ticket as TicketIcon, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export default function AdminPanel() {
  const { user, adminIds, eventParticipants, tickets, verifyTicket } = useStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setIsAdmin(adminIds.includes(user.id));
  }, [user.id, adminIds]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4">
        <Shield className="w-24 h-24 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-gray-400">You do not have permission to access this page</p>
      </div>
    );
  }

  const filteredParticipants = eventParticipants.filter(participant =>
    participant.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.ticketNumber.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Shield className="w-10 h-10 text-yellow-500" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Tickets Sold</p>
                <p className="text-4xl font-bold mt-2">{tickets.length}</p>
              </div>
              <TicketIcon className="w-12 h-12 text-blue-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Verified Tickets</p>
                <p className="text-4xl font-bold mt-2">
                  {eventParticipants.filter(p => p.isVerified).length}
                </p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Pending Verification</p>
                <p className="text-4xl font-bold mt-2">
                  {eventParticipants.filter(p => !p.isVerified).length}
                </p>
              </div>
              <XCircle className="w-12 h-12 text-orange-300" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <Users className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold">Event Participants</h2>
          </div>

          <input
            type="text"
            placeholder="Search by name or ticket number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
          />

          {filteredParticipants.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No participants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Ticket #</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Purchase Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => (
                    <tr key={participant.ticketId} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                      <td className="py-4 px-4">
                        <span className="bg-yellow-600/30 text-yellow-300 px-3 py-1 rounded-full text-sm font-mono">
                          #{String(participant.ticketNumber).padStart(8, '0')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {participant.userPhoto ? (
                            <img
                              src={participant.userPhoto}
                              alt={participant.userName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold">
                              {participant.userName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium">{participant.userName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {new Date(participant.purchaseDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        {participant.isVerified ? (
                          <span className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-orange-400">
                            <XCircle className="w-5 h-5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {!participant.isVerified && (
                          <button
                            onClick={() => verifyTicket(participant.ticketNumber)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Verify
                          </button>
                        )}
                        {participant.isVerified && (
                          <span className="text-gray-500">Already verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
