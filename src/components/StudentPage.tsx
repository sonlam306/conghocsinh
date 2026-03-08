import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Search, FileText, Clock } from 'lucide-react';

interface SearchResult {
  id: number;
  fullName: string;
  className: string;
  school: string;
  groupName: string;
  originalName: string;
  submittedAt: string;
  grade?: string;
  feedback?: string;
}

export default function StudentPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    className: '',
    school: '',
    groupName: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [activeTab, setActiveTab] = useState<'submit' | 'search'>('submit');
  const [searchData, setSearchData] = useState({ fullName: '', className: '' });
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setErrorMessage('Vui lòng chọn file để nộp.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMessage('');

    const data = new FormData();
    data.append('fullName', formData.fullName);
    data.append('className', formData.className);
    data.append('school', formData.school);
    data.append('groupName', formData.groupName);
    data.append('file', file);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        throw new Error('Có lỗi xảy ra khi nộp bài.');
      }

      setStatus('success');
      setFormData({ fullName: '', className: '', school: '', groupName: '' });
      setFile(null);
      // Reset file input manually if needed, but it's uncontrolled
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Lỗi kết nối.');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchData.fullName || !searchData.className) {
      setSearchError('Vui lòng nhập họ tên và lớp.');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    
    try {
      const response = await fetch(`/api/submissions/search?fullName=${encodeURIComponent(searchData.fullName)}&className=${encodeURIComponent(searchData.className)}`);
      if (!response.ok) throw new Error('Lỗi khi tìm kiếm');
      
      const data = await response.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('Không tìm thấy bài nộp nào phù hợp.');
      }
    } catch (err) {
      setSearchError('Có lỗi xảy ra khi tìm kiếm.');
    } finally {
      setIsSearching(false);
    }
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
            Cổng Học Sinh
          </h2>
          
          <div className="mt-6 flex justify-center space-x-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('submit')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'submit' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Nộp Bài
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`pb-2 px-4 text-sm font-medium transition-colors ${
                activeTab === 'search' 
                  ? 'border-b-2 border-indigo-600 text-indigo-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tra Cứu Kết Quả
            </button>
          </div>
        </div>

        {activeTab === 'submit' && (
          status === 'success' ? (
            <div className="rounded-xl bg-emerald-50 p-6 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-medium text-emerald-800">Nộp bài thành công!</h3>
              <p className="mt-2 text-sm text-emerald-600">
                Cảm ơn bạn. Bài của bạn đã được ghi nhận.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-6 w-full inline-flex justify-center rounded-xl border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Nộp bài khác
              </button>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                    Họ và tên
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label htmlFor="className" className="block text-sm font-medium text-slate-700">
                    Lớp
                  </label>
                  <input
                    id="className"
                    name="className"
                    type="text"
                    required
                    value={formData.className}
                    onChange={handleInputChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="10A1"
                  />
                </div>

                <div>
                  <label htmlFor="school" className="block text-sm font-medium text-slate-700">
                    Trường
                  </label>
                  <input
                    id="school"
                    name="school"
                    type="text"
                    required
                    value={formData.school}
                    onChange={handleInputChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="THPT Chuyên..."
                  />
                </div>

                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium text-slate-700">
                    Nhóm
                  </label>
                  <input
                    id="groupName"
                    name="groupName"
                    type="text"
                    required
                    value={formData.groupName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Nhóm 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">File bài làm</label>
                  <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 pt-5 pb-6 hover:border-indigo-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500"
                        >
                          <span>Tải file lên</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">
                        {file ? file.name : 'PDF, DOCX, ZIP, RAR...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {status === 'error' && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="group relative flex w-full justify-center rounded-xl border border-transparent bg-indigo-600 py-3 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors"
                >
                  {status === 'submitting' ? 'Đang nộp...' : 'Nộp Bài'}
                </button>
              </div>
            </form>
          )
        )}

        {activeTab === 'search' && (
          <div className="mt-8 space-y-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="searchFullName" className="block text-sm font-medium text-slate-700">
                    Họ và tên
                  </label>
                  <input
                    id="searchFullName"
                    name="fullName"
                    type="text"
                    required
                    value={searchData.fullName}
                    onChange={handleSearchChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Nhập họ tên..."
                  />
                </div>
                <div>
                  <label htmlFor="searchClassName" className="block text-sm font-medium text-slate-700">
                    Lớp
                  </label>
                  <input
                    id="searchClassName"
                    name="className"
                    type="text"
                    required
                    value={searchData.className}
                    onChange={handleSearchChange}
                    className="mt-1 block w-full appearance-none rounded-xl border border-slate-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    placeholder="Nhập lớp..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="w-full flex justify-center items-center rounded-xl border border-transparent bg-slate-800 py-2 px-4 text-sm font-medium text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:bg-slate-600 transition-colors"
              >
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </form>

            {searchError && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {searchError}
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">Kết quả ({searchResults.length})</h3>
                {searchResults.map((result) => (
                  <div key={result.id} className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-indigo-500 mr-2" />
                        <span className="font-medium text-slate-900 truncate max-w-[200px]" title={result.originalName}>
                          {result.originalName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatDate(result.submittedAt)}
                      </span>
                    </div>
                    
                    <div className="mt-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                      {result.grade ? (
                        <div>
                          <div className="flex items-center mb-2">
                            <span className="text-sm font-medium text-slate-700 mr-2">Điểm số:</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                              {result.grade}
                            </span>
                          </div>
                          {result.feedback && (
                            <div className="mt-2">
                              <span className="text-sm font-medium text-slate-700 block mb-1">Nhận xét của giáo viên:</span>
                              <p className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                                {result.feedback}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic flex items-center">
                          <Clock className="h-4 w-4 mr-1" /> Bài nộp đang chờ chấm điểm.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
