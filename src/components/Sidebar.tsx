import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, BookOpen, Home, Menu, MessageSquare, PenTool, Settings, Store, Trophy, X } from 'lucide-react';
import { useQuizContext } from '../context/QuizContext';
import { MOCK_USERS } from '../data/mockData';

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { selectedUserId } = useQuizContext();
    const currentUser = MOCK_USERS.find((u) => u.id === selectedUserId);

    useEffect(() => { setIsOpen(false); }, [location.pathname]);
    const handleNavigation = (path: string) => { navigate(path); setIsOpen(false); };

    const navItems = [
        { path: '/', icon: Home, label: '홈' },
        { path: '/summary', icon: BookOpen, label: 'QT 요약' },
        { path: '/wrong-answers', icon: AlertCircle, label: '오답 노트' },
        { path: '/diary', icon: PenTool, label: '큐티 일기' },
        { path: '/community', icon: MessageSquare, label: '커뮤니티' },
        { path: '/store', icon: Store, label: '포인트 교환소' },
        { path: '/leaderboard', icon: Trophy, label: '명예의 전당' },
    ];

    return (
        <>
            {/* 햄버거 버튼 */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed top-5 left-5 z-40 p-2.5 bg-white border border-blue-100 rounded-full text-[#8B95A1] hover:text-[#0064FF] hover:border-blue-300 shadow-sm transition-all active:scale-90"
            >
                <Menu className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsOpen(false)} className="fixed inset-0 bg-[#191F28]/30 backdrop-blur-sm z-50" />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-blue-100 z-50 flex flex-col shadow-[4px_0_40px_rgba(0,100,255,0.1)]"
                        >
                            {/* 헤더 */}
                            <div className="p-6 flex items-center justify-between border-b border-blue-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#0064FF] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,100,255,0.3)]">
                                        <BookOpen className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-[15px] text-[#191F28]">고등부 QT 퀴즈</h2>
                                        {currentUser
                                            ? <p className="text-[12px] text-[#0064FF] font-black">{currentUser.name} 님</p>
                                            : <p className="text-[12px] text-[#B0B8C1] font-bold">이름을 선택해주세요</p>}
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="p-2 text-[#B0B8C1] hover:text-[#191F28] hover:bg-blue-50 rounded-full transition-all active:scale-90">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* 메뉴 목록 */}
                            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
                                <p className="text-[11px] font-black text-[#B0B8C1] uppercase tracking-widest mb-2 px-3">메뉴</p>
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button key={item.path} onClick={() => handleNavigation(item.path)}
                                            className={`flex items-center gap-3.5 w-full text-left px-4 py-3 rounded-[14px] transition-all active:scale-[0.98] font-bold text-[14px] ${isActive ? 'bg-[#0064FF] text-white shadow-[0_4px_12px_rgba(0,100,255,0.25)]' : 'text-[#4E5968] hover:bg-blue-50 hover:text-[#0064FF]'}`}>
                                            <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-[#B0B8C1]'}`} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 하단 관리자 */}
                            <div className="p-4 border-t border-blue-50">
                                <button onClick={() => handleNavigation('/admin')}
                                    className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-[14px] text-[#B0B8C1] hover:bg-blue-50 hover:text-[#0064FF] transition-all font-bold text-[13px] active:scale-[0.98]">
                                    <Settings className="w-4 h-4 shrink-0" />관리자 메뉴
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
