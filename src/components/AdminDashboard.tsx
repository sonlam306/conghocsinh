import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut, FileText, Clock, Users, School, BookOpen, Edit3, X, Check, Trash2 } from 'lucide-react';

interface Submission {
  id: number;
  fullName: string;
  className: string;
  school: string;
  groupName: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  submittedAt: string;
  grade?: string;
  feedback?: string;
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin');
      return;
    }

    fetchSubmissions(token);
  }, [navigate]);

  const fetchSubmissions = async (token: string) => {
    try {
      const response = await fetch('/api/admin/submissions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        navigate('/admin');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (err) {
      setError('Không thể tải danh sách bài nộp.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const handleDownload = async (id: number, originalName: string) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/admin/download/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Không thể tải file. File có thể đã bị xóa trên máy chủ.');
    }
  };

  const startGrading = (sub: Submission) => {
    setGradingId(sub.id);
    setGradeInput(sub.grade || '');
    setFeedbackInput(sub.feedback || '');
  };

  const cancelGrading = () => {
    setGradingId(null);
    setGradeInput('');
    setFeedbackInput('');
  };

  const submitGrade = async (id: number) => {
    const token = localStorage.getItem('adminToken');
    setIsSubmittingGrade(true);
    try {
      const response = await fetch(`/api/admin/grade/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade: gradeInput, feedback: feedbackInput })
      });

      if (!response.ok) throw new Error('Failed to submit grade');

      // Update local state
      setSubmissions(submissions.map(s => 
        s.id === id ? { ...s, grade: gradeInput, feedback: feedbackInput } : s
      ));
      setGradingId(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu điểm.');
    } finally {
      setIsSubmittingGrade(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`/api/admin/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete submission');

      // Update local state
      setSubmissions(submissions.filter(s => s.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa bài nộp.');
      setDeleteConfirmId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const uniqueClasses = Array.from(new Set(submissions.map(s => s.className))).sort();
  
  const filteredSubmissions = selectedClass === 'all' 
    ? submissions 
    : submissions.filter(s => s.className === selectedClass);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-indigo-600 mr-2" />
              <h1 className="text-xl font-semibold text-slate-900">Quản lý bài nộp</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-slate-500 bg-white hover:text-slate-700 focus:outline-none transition"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <h3 className="text-lg leading-6 font-medium text-slate-900">
              Danh sách bài nộp ({filteredSubmissions.length})
            </h3>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <label htmlFor="class-filter" className="text-sm font-medium text-slate-700 mr-2">
                  Lọc theo lớp:
                </label>
                <select
                  id="class-filter"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                >
                  <option value="all">Tất cả các lớp</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => fetchSubmissions(localStorage.getItem('adminToken') || '')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Làm mới
              </button>
            </div>
          </div>
          
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Chưa có bài nộp nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Học sinh
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Thông tin
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      File
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Điểm & Phản hồi
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Hành động</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                            {sub.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-slate-900">{sub.fullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 flex items-center mb-1">
                          <BookOpen className="h-3 w-3 mr-1 text-slate-400" /> {sub.className}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center mb-1">
                          <School className="h-3 w-3 mr-1 text-slate-400" /> {sub.school}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center">
                          <Users className="h-3 w-3 mr-1 text-slate-400" /> {sub.groupName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900 max-w-[200px] truncate" title={sub.originalName}>
                          {sub.originalName}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatFileSize(sub.size)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-slate-400" />
                          {formatDate(sub.submittedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {gradingId === sub.id ? (
                          <div className="space-y-2 min-w-[200px]">
                            <input
                              type="text"
                              value={gradeInput}
                              onChange={(e) => setGradeInput(e.target.value)}
                              placeholder="Điểm (VD: 9.5)"
                              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1 border"
                            />
                            <textarea
                              value={feedbackInput}
                              onChange={(e) => setFeedbackInput(e.target.value)}
                              placeholder="Nhận xét..."
                              rows={2}
                              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1 border"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => submitGrade(sub.id)}
                                disabled={isSubmittingGrade}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none"
                              >
                                <Check className="h-3 w-3 mr-1" /> Lưu
                              </button>
                              <button
                                onClick={cancelGrading}
                                disabled={isSubmittingGrade}
                                className="inline-flex items-center px-2 py-1 border border-slate-300 text-xs font-medium rounded text-slate-700 bg-white hover:bg-slate-50 focus:outline-none"
                              >
                                <X className="h-3 w-3 mr-1" /> Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {sub.grade ? (
                              <div className="mb-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                  Điểm: {sub.grade}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 mb-1">
                                Chưa chấm
                              </span>
                            )}
                            {sub.feedback && (
                              <p className="text-xs text-slate-600 line-clamp-2" title={sub.feedback}>
                                {sub.feedback}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col space-y-2 items-end">
                          <button
                            onClick={() => handleDownload(sub.id, sub.originalName)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Tải về
                          </button>
                          {gradingId !== sub.id && (
                            <button
                              onClick={() => startGrading(sub)}
                              className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                              <Edit3 className="h-4 w-4 mr-1" />
                              {sub.grade ? 'Sửa điểm' : 'Chấm điểm'}
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirmId(sub.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-2">Xác nhận xóa</h3>
            <p className="text-sm text-slate-500 mb-6">
              Bạn có chắc chắn muốn xóa bài nộp này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Xóa bài nộp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
