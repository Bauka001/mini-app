import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, Ticket as TicketIcon, CheckCircle, XCircle, RefreshCcw, AlertCircle } from 'lucide-react';
import { AdminTicketRecord, AdminTicketsResponse, getAdminTickets, verifyAdminTicket } from '../utils/adminApi';
import { useTranslation } from 'react-i18next';

export default function AdminPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminTicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'used'>('all');
  const [busyTicketNumber, setBusyTicketNumber] = useState<number | null>(null);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const nextData = await getAdminTickets();
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('tickets_load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return (data?.tickets || []).filter((ticket) => {
      const matchesSearch =
        !query ||
        ticket.userName.toLowerCase().includes(query) ||
        String(ticket.ticketNumber).includes(query) ||
        String(ticket.userTelegramId).includes(query);
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data?.tickets, searchTerm, statusFilter]);

  const patchTicket = (ticket: AdminTicketRecord) => {
    setData((current) => {
      if (!current) {
        return current;
      }

      const tickets = current.tickets.map((item) => (item.id === ticket.id ? ticket : item));

      return {
        tickets,
        stats: {
          total: tickets.length,
          pending: tickets.filter((item) => item.status === 'pending').length,
          verified: tickets.filter((item) => item.status === 'verified').length,
          used: tickets.filter((item) => item.status === 'used').length,
        },
      };
    });
  };

  const handleVerify = async (ticket: AdminTicketRecord) => {
    const confirmed = window.confirm(`Тікетті растау керек пе? #${ticket.ticketNumber}`);

    if (!confirmed) {
      return;
    }

    try {
      setBusyTicketNumber(ticket.ticketNumber);
      const response = await verifyAdminTicket(ticket.ticketNumber);
      patchTicket(response.ticket);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('ticket_verification_failed'));
    } finally {
      setBusyTicketNumber(null);
    }
  };

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleString('ru-RU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Shield className="w-10 h-10 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold">Tickets Center</h1>
              <p className="mt-1 text-sm text-gray-400">Legacy flow removed, backend-backed verification enabled</p>
            </div>
          </div>
          <button
            onClick={() => void loadTickets()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-bold transition hover:bg-blue-700"
          >
            <RefreshCcw className="w-4 h-4" />
            {t('refresh')}
          </button>
        </div>

        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Total Tickets Sold</p>
                <p className="text-4xl font-bold mt-2">{data?.stats.total ?? 0}</p>
              </div>
              <TicketIcon className="w-12 h-12 text-blue-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Verified Tickets</p>
                <p className="text-4xl font-bold mt-2">{data?.stats.verified ?? 0}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-300" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-200 text-sm">Pending Verification</p>
                <p className="text-4xl font-bold mt-2">{data?.stats.pending ?? 0}</p>
              </div>
              <XCircle className="w-12 h-12 text-orange-300" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 shadow-lg">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <TicketIcon className="w-8 h-8 text-purple-400" />
              <h2 className="text-2xl font-bold">Ticket queue</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'verified', 'used'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {status === 'all' ? t('all') : status}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/50 px-4 py-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ticket #, user name, Telegram ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-400 outline-none"
            />
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <p>{t('loading_tickets')}</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>{t('no_tickets_found')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('ticket_number')}</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('user')}</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('event')}</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('purchase_date')}</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">{t('status')}</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition">
                      <td className="py-4 px-4">
                        <span className="bg-yellow-600/30 text-yellow-300 px-3 py-1 rounded-full text-sm font-mono">
                          #{String(ticket.ticketNumber).padStart(8, '0')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{ticket.userName}</p>
                          <p className="text-xs text-gray-400">Telegram ID: {ticket.userTelegramId}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        <div className="flex items-center gap-3">
                          {ticket.eventName.includes('VIP') || ticket.eventName.includes('Premium') ? (
                            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-yellow-500/30">
                              <img src="/champions-trophy.svg" alt="Brain Champions League" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <TicketIcon className="w-8 h-8 text-gray-500" />
                          )}
                          <div>
                            <p>{ticket.eventName}</p>
                            <p className="text-xs text-gray-400">{formatDate(ticket.eventDate)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {formatDate(ticket.purchaseDate)}
                      </td>
                      <td className="py-4 px-4">
                        {ticket.status === 'verified' ? (
                          <span className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            Verified
                          </span>
                        ) : ticket.status === 'used' ? (
                          <span className="flex items-center gap-2 text-gray-400">
                            <CheckCircle className="w-5 h-5" />
                            Used
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-orange-400">
                            <XCircle className="w-5 h-5" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {ticket.status === 'pending' ? (
                          <button
                            onClick={() => void handleVerify(ticket)}
                            disabled={busyTicketNumber === ticket.ticketNumber}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Verify
                          </button>
                        ) : (
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
