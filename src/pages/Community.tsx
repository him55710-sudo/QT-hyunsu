import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Heart, Send, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuizContext } from '../context/QuizContext';
import { MOCK_USERS } from '../data/mockData';
// 👇 Firebase에서 필요한 기능들 불러오기
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { db } from '../firebase'; // 방금 만든 파일 연결

export default function Community() {
    const navigate = useNavigate();
    const { selectedUserId } = useQuizContext();
    const currentUser = MOCK_USERS.find(u => u.id === selectedUserId);

    const [posts, setPosts] = useState<any[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});

    // 1. 실시간으로 게시글 불러오기 (Firebase 연동)
    useEffect(() => {
        // 'posts'라는 폴더(컬렉션)에서 글을 가져오되, 작성시간(createdAt) 기준 내림차순(최신순)으로 가져옵니다.
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));

        // onSnapshot: 누군가 새 글을 쓰면 자동으로 화면을 업데이트해줍니다.
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPosts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPosts(fetchedPosts);
        });

        // 컴포넌트가 꺼질 때 실시간 연결 해제
        return () => unsubscribe();
    }, []);

    if (!selectedUserId) {
        return (
            <div className="flex flex-col min-h-screen bg-slate-50 p-6 items-center justify-center">
                <p className="text-slate-500 mb-4">로그인이 필요합니다.</p>
                <button onClick={() => navigate('/')} className="px-5 py-3 bg-indigo-500 text-white rounded-xl shadow-sm">홈으로</button>
            </div>
        );
    }

    // 2. 새 글 쓰기
    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostContent.trim() || !currentUser) return;

        // Firebase에 새 글 저장
        await addDoc(collection(db, 'posts'), {
            authorId: currentUser.id,
            authorName: currentUser.name,
            content: newPostContent,
            createdAt: Date.now(), // 정렬을 위한 시간
            timestamp: new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), // 화면 표시용 시간
            likes: 0,
            likedBy: [], // 좋아요 누른 사람 기록
            comments: [] // 댓글 목록
        });

        setNewPostContent('');
    };

    // 3. 댓글 달기
    const handleAddComment = async (postId: string, e: React.FormEvent) => {
        e.preventDefault();
        const content = commentInput[postId];
        if (!content?.trim() || !currentUser) return;

        // Firebase의 특정 게시물에 댓글 추가
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            comments: arrayUnion({
                id: Date.now().toString(),
                authorName: currentUser.name,
                content: content,
                timestamp: '방금 전'
            })
        });

        setCommentInput(prev => ({ ...prev, [postId]: '' }));
    };

    // 4. 좋아요 누르기
    const toggleLike = async (postId: string, postLikedBy: number[]) => {
        if (!currentUser) return;
        const postRef = doc(db, 'posts', postId);
        const hasLiked = postLikedBy?.includes(currentUser.id);

        if (hasLiked) {
            // 이미 좋아요를 눌렀다면 취소
            await updateDoc(postRef, {
                likes: increment(-1),
                likedBy: arrayRemove(currentUser.id)
            });
        } else {
            // 안 눌렀다면 좋아요 추가
            await updateDoc(postRef, {
                likes: increment(1),
                likedBy: arrayUnion(currentUser.id)
            });
        }
    };

    return (
        <div className="flex flex-col min-h-[100dvh] bg-[#F5F7FA] text-slate-800 relative">
            {/* Header */}
            <header className="flex items-center justify-between p-6 sticky top-0 bg-[#F5F7FA]/90 backdrop-blur-md z-20 border-b border-indigo-900/5">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="p-2 bg-white text-slate-600 shadow-sm border border-slate-200 rounded-full active:scale-95">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                        고등부 나눔 게시판
                    </h1>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-10">
                {/* 글쓰기 영역 */}
                <div className="p-6 pb-2 min-h-0">
                    <form onSubmit={handleCreatePost} className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50 flex flex-col gap-3">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {currentUser?.name.charAt(currentUser.name.length - 1)}
                            </div>
                            <span className="font-bold text-sm text-slate-700">{currentUser?.name}</span>
                        </div>
                        <input
                            type="text"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="큐티 후기나 학교 생활을 자유롭게 나눠보세요!"
                            className="bg-slate-50 border-none outline-none p-3 rounded-2xl w-full text-sm resize-none focus:ring-2 ring-indigo-100"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!newPostContent.trim()}
                                className="px-5 py-2 bg-indigo-500 text-white text-sm font-bold rounded-xl active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                            >
                                올리기
                            </button>
                        </div>
                    </form>
                </div>

                {/* 피드 게시물 목록 */}
                <div className="p-6 pt-4 flex flex-col gap-6">
                    <AnimatePresence>
                        {posts.map((post) => (
                            <motion.div
                                key={post.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-slate-100/50"
                            >
                                {/* 작성자 정보 */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner ${post.authorId === 999 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-300'}`}>
                                            {post.authorName.charAt(post.authorName.length - 1)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[15px] flex items-center gap-1">
                                                {post.authorName}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium">{post.timestamp}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 본문 */}
                                <p className="text-[15px] leading-relaxed text-slate-700 font-medium mb-4 whitespace-pre-wrap">
                                    {post.content}
                                </p>

                                {/* 좋아요 및 댓글 수 통계 */}
                                <div className="flex items-center gap-4 py-3 border-y border-slate-50 mb-3 text-sm text-slate-500 font-medium">
                                    <button
                                        onClick={() => toggleLike(post.id, post.likedBy || [])}
                                        className={`flex items-center gap-1.5 transition-colors ${post.likedBy?.includes(currentUser?.id) ? 'text-rose-500' : 'hover:text-rose-500'}`}
                                    >
                                        <Heart className={`w-4 h-4 ${post.likedBy?.includes(currentUser?.id) ? 'fill-rose-500' : ''}`} />
                                        좋아요 {post.likes}
                                    </button>
                                    <div className="flex items-center gap-1.5">
                                        <MessageSquare className="w-4 h-4" />
                                        댓글 {post.comments?.length || 0}
                                    </div>
                                </div>

                                {/* 댓글 목록 */}
                                {post.comments?.length > 0 && (
                                    <div className="flex flex-col gap-3 mb-4 bg-slate-50/50 p-3 rounded-2xl">
                                        {post.comments.map((comment: any) => (
                                            <div key={comment.id} className="text-sm flex flex-col gap-0.5">
                                                <div>
                                                    <span className="font-bold text-slate-800 mr-2">{comment.authorName}</span>
                                                    <span className="text-slate-600">{comment.content}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 댓글 달기 인풋 */}
                                <form onSubmit={(e) => handleAddComment(post.id, e)} className="flex items-center gap-2 relative mt-4">
                                    <input
                                        type="text"
                                        value={commentInput[post.id] || ''}
                                        onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                                        placeholder="댓글 달기..."
                                        className="w-full bg-slate-50 text-sm py-2.5 px-4 rounded-full border-none outline-none focus:ring-2 ring-indigo-100 pr-12"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!commentInput[post.id]?.trim()}
                                        className="absolute right-1 top-1 p-1.5 bg-indigo-500 text-white rounded-full disabled:opacity-0 transition-opacity"
                                    >
                                        <Send className="w-4 h-4 ml-0.5" />
                                    </button>
                                </form>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
