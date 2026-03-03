import { useState, useMemo } from 'react';
import { ArrowLeft, Ticket, PartyPopper, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { MOCK_USERS } from '../data/mockData';
import confetti from 'canvas-confetti';

const STORE_ITEMS = [
    { id: 'item_500', title: '카페 음료 1잔', price: 500, desc: '아메리카노, 라떼 등', icon: '☕', color: '#f4a261' },
    { id: 'item_1500', title: '식사 한 끼', price: 1500, desc: '국밥, 햄버거 세트 등', icon: '🍔', color: '#e76f51' },
    { id: 'item_3000', title: '애슐리 퀸즈', price: 3000, desc: '프리미엄 뷔페 이용권', icon: '👑', color: '#8b5cf6' },
];

export default function Store() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'shop' | 'inventory'>('shop');
    const { selectedUserId, scores, purchasedCoupons, buyCoupon } = useQuizContext();
    const currentUser = MOCK_USERS.find(u => u.id === selectedUserId);
    const totalScore = useMemo(() => {
        if (!selectedUserId) return 0;
        return Object.entries(scores).filter(([k]) => k.startsWith(`${selectedUserId}_`)).reduce((s, [, v]) => s + v, 0);
    }, [scores, selectedUserId]);
    const myCoupons = useMemo(() => selectedUserId ? (purchasedCoupons[selectedUserId.toString()] || []) : [], [purchasedCoupons, selectedUserId]);
    const spentPoints = useMemo(() => myCoupons.reduce((s, c) => s + c.price, 0), [myCoupons]);
    const currentPoints = totalScore - spentPoints;

    const handleBuy = (item: typeof STORE_ITEMS[0]) => {
        if (!selectedUserId) return;
        if (currentPoints < item.price) { alert('포인트가 부족합니다!'); return; }
        if (window.confirm(`[${item.title}]을 ${item.price}P에 교환할까요?`)) {
            const success = buyCoupon(selectedUserId, { couponId: item.id, title: item.title, price: item.price });
            if (success) { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0064FF', '#60a5fa', '#fff'] }); alert('🎉 교환 완료!'); setActiveTab('inventory'); }
        }
    };

    if (!selectedUserId) return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF] p-6 items-center justify-center">
            <p className="text-[#8B95A1] mb-4 text-[14px] font-bold">이름을 먼저 선택해주세요.</p>
            <button onClick={() => navigate('/')} className="px-6 py-3 bg-[#0064FF] text-white rounded-[14px] font-black shadow-[0_4px_12px_rgba(0,100,255,0.3)]">홈으로</button>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#F2F6FF]">
            <div className="px-5 pt-14 pb-4">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate('/')} className="p-2 bg-white rounded-full border border-blue-100 shadow-sm active:scale-90"><ArrowLeft className="w-5 h-5 text-[#8B95A1]" /></button>
                    <h1 className="text-[18px] font-black text-[#191F28]">포인트 교환소</h1>
                </div>
                {/* 포인트 카드 */}
                <div className="bg-[#0064FF] rounded-[24px] p-6 mb-4 shadow-[0_8px_32px_rgba(0,100,255,0.25)]">
                    <p className="text-[13px] text-blue-200 font-bold mb-1">{currentUser?.name} 님의 포인트</p>
                    <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-[40px] font-black text-white tracking-tight">{currentPoints.toLocaleString()}</span>
                        <span className="text-[20px] font-black text-blue-200">P</span>
                    </div>
                    <p className="text-[12px] text-blue-200/70 font-bold">총 획득 {totalScore}P · 사용 {spentPoints}P</p>
                </div>
                {/* 탭 */}
                <div className="flex bg-white border border-blue-100 rounded-[16px] p-1 shadow-sm">
                    <button onClick={() => setActiveTab('shop')} className={`flex-1 py-2.5 text-[13px] font-black rounded-[12px] transition-all ${activeTab === 'shop' ? 'bg-[#0064FF] text-white shadow-sm' : 'text-[#8B95A1]'}`}>교환 목록</button>
                    <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-2.5 text-[13px] font-black rounded-[12px] transition-all ${activeTab === 'inventory' ? 'bg-[#0064FF] text-white shadow-sm' : 'text-[#8B95A1]'}`}>내 쿠폰함 {myCoupons.length > 0 && `(${myCoupons.length})`}</button>
                </div>
            </div>
            <main className="flex-1 px-5 pb-10">
                <AnimatePresence mode="sync">
                    {activeTab === 'shop' ? (
                        <motion.div key="shop" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                            {STORE_ITEMS.map((item, idx) => {
                                const canAfford = currentPoints >= item.price;
                                return (
                                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                                        className={`bg-white border rounded-[20px] p-5 shadow-sm transition-all ${canAfford ? 'border-blue-50' : 'border-blue-50 opacity-60'}`}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl" style={{ backgroundColor: item.color + '20', border: `1px solid ${item.color}40` }}>{item.icon}</div>
                                            <div><h3 className="font-black text-[15px] text-[#191F28]">{item.title}</h3><p className="text-[12px] text-[#8B95A1] font-bold">{item.desc}</p></div>
                                        </div>
                                        <button onClick={() => handleBuy(item)} disabled={!canAfford}
                                            className={`w-full py-3 rounded-[14px] font-black text-[14px] flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${canAfford ? 'bg-[#0064FF] text-white shadow-[0_4px_12px_rgba(0,100,255,0.25)]' : 'bg-[#F2F6FF] text-[#B0B8C1]'}`}>
                                            {canAfford ? <><PartyPopper className="w-4 h-4" />{item.price.toLocaleString()}P 교환</> : `${item.price.toLocaleString()}P 필요`}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <motion.div key="inventory" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                            {myCoupons.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket className="w-7 h-7 text-blue-200" /></div>
                                    <p className="text-[#B0B8C1] text-[14px] font-bold">아직 쿠폰이 없어요.<br />퀴즈를 풀고 포인트를 모아보세요!</p>
                                </div>
                            ) : myCoupons.map((coupon, idx) => {
                                const storeItem = STORE_ITEMS.find(s => s.id === coupon.couponId);
                                return (
                                    <motion.div key={coupon.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
                                        className="bg-white border border-blue-50 rounded-[20px] p-5 flex items-center gap-4 shadow-sm">
                                        <div className="w-11 h-11 rounded-[12px] flex items-center justify-center text-xl" style={{ backgroundColor: (storeItem?.color || '#0064FF') + '20' }}>{storeItem?.icon || '🎫'}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-[#B0B8C1] font-bold mb-0.5">{coupon.purchasedAt} · 사용 가능</p>
                                            <h3 className="font-black text-[14px] text-[#191F28] truncate">{coupon.title}</h3>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-[#B0B8C1] shrink-0" />
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}
