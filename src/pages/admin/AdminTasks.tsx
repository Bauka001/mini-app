import { useEffect, useState } from 'react';
import { Share2, Save, Trash2, Plus, RefreshCcw, AlertCircle, Edit2, X } from 'lucide-react';
import { 
  AdminSocialTask, 
  getAdminTasks, 
  addAdminTask, 
  updateAdminTask, 
  deleteAdminTask 
} from '../../utils/adminApi';

export default function AdminTasks() {
  const [tasks, setTasks] = useState<AdminSocialTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminSocialTask | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [id, setId] = useState('');
  const [platform, setPlatform] = useState<AdminSocialTask['platform']>('telegram');
  const [url, setUrl] = useState('');
  const [reward, setReward] = useState(10);
  const [isActive, setIsActive] = useState(true);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAdminTasks();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Тапсырмалар жүктелмеді');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const openForm = (task?: AdminSocialTask) => {
    if (task) {
      setEditingTask(task);
      setId(task.id);
      setPlatform(task.platform);
      setUrl(task.url);
      setReward(task.reward);
      setIsActive(task.is_active);
    } else {
      setEditingTask(null);
      setId('');
      setPlatform('telegram');
      setUrl('');
      setReward(10);
      setIsActive(true);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleSave = async () => {
    if (!id.trim() || !url.trim()) {
      setError('ID мен URL міндетті түрде толтырылуы керек');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const payload = {
        id: id.trim(),
        platform,
        url: url.trim(),
        reward,
        is_active: isActive
      };

      if (editingTask) {
        await updateAdminTask(payload);
      } else {
        await addAdminTask(payload);
      }
      
      await loadTasks();
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Тапсырма сақталмады');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Бұл тапсырманы өшіргіңіз келе ме?')) {
      return;
    }

    try {
      setError(null);
      await deleteAdminTask(taskId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Тапсырма өшірілмеді');
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Share2 className="w-8 h-8 text-blue-400" />
            Social Tasks
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => openForm()}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              Жаңа тапсырма
            </button>
            <button
              onClick={() => void loadTasks()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <RefreshCcw className="w-4 h-4" />
              Жаңарту
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isFormOpen && (
          <div className="mb-8 bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700 relative">
            <button 
              onClick={closeForm}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">
              {editingTask ? 'Тапсырманы өңдеу' : 'Жаңа тапсырма қосу'}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ID (мысалы: yt_founding)</label>
                <input
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  disabled={!!editingTask}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Платформа</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as AdminSocialTask['platform'])}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="telegram">Telegram</option>
                  <option value="youtube">YouTube</option>
                  <option value="instagram">Instagram</option>
                  <option value="twitter">Twitter</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">URL (Сілтеме)</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Сыйақы (Gems)</label>
                <input
                  type="number"
                  value={reward}
                  onChange={(e) => setReward(Number(e.target.value))}
                  min={0}
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer py-2">
                  <div className={`w-12 h-7 rounded-full transition-colors relative ${isActive ? 'bg-green-500' : 'bg-gray-600'}`}>
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${isActive ? 'left-6' : 'left-1'}`} />
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="hidden"
                  />
                  <span>Белсенді</span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
              >
                Болдырмау
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Сақталуда...' : 'Сақтау'}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Жүктелуде...</div>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-12 text-center text-gray-400">
            Тапсырмалар табылмады. Жаңасын қосыңыз.
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div key={task.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${task.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {task.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="font-mono text-sm text-blue-300">{task.id}</span>
                    <span className="text-sm bg-gray-700 px-2 py-0.5 rounded">{task.platform}</span>
                  </div>
                  <a href={task.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition break-all text-sm mb-1 block">
                    {task.url}
                  </a>
                  <div className="text-xs text-gray-500 flex gap-4">
                    <span>Сыйақы: <strong className="text-yellow-400">{task.reward} gems</strong></span>
                    <span>Жаңартылды: {formatDate(task.updated_at)}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openForm(task)}
                    className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                    title="Өңдеу"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(task.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                    title="Өшіру"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
