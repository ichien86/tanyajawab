import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import QnaFeed from '../components/QnaFeed';
import { subscribeToEvents } from '../utils/sseClient';

export default function ParticipantPage() {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [counts, setCounts] = useState({ total: 0, unanswered: 0, answered: 0 });
  const [sort, setSort] = useState('top');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userFingerprint, setUserFingerprint] = useState('');

  const sortRef = useRef(sort);
  const searchRef = useRef(search);
  sortRef.current = sort;
  searchRef.current = search;

  useEffect(() => {
    let fp = localStorage.getItem('tj_device_fingerprint');
    if (!fp) {
      fp = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('tj_device_fingerprint', fp);
    }
    setUserFingerprint(fp);
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/admin/session?session_id=default_session');
      const data = await res.json();
      if (data.success) setSession(data.data);
    } catch (_) {}
  };

  const fetchQuestions = async (targetSort = sortRef.current, targetSearch = searchRef.current) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/qna/questions?session_id=default_session&sort=${targetSort}&search=${encodeURIComponent(targetSearch)}`);
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  useEffect(() => {
    fetchQuestions(sort, search);
  }, [sort, search]);

  useEffect(() => {
    const unsubscribe = subscribeToEvents((event) => {
      if (event.type === 'status') {
        setIsConnected(event.connected);
      } else if (event.type === 'connected') {
        setIsConnected(true);
      } else if (event.type === 'qna_update') {
        fetchQuestions(sortRef.current, searchRef.current);
      } else if (event.type === 'session_update') {
        fetchSession();
      }
    });

    return unsubscribe;
  }, []);

  const handleUpvote = async (questionId) => {
    if (!userFingerprint) return;
    try {
      setQuestions((prev) =>
        prev.map((q) => {
          if (q._id === questionId) {
            const hasVoted = q.upvotes?.includes(userFingerprint);
            const nextUpvotes = hasVoted
              ? (q.upvotes || []).filter((fp) => fp !== userFingerprint)
              : [...(q.upvotes || []), userFingerprint];
            return { ...q, upvotes: nextUpvotes };
          }
          return q;
        })
      );

      await fetch(`/api/qna/questions/${questionId}/upvote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: userFingerprint })
      });
    } catch (_) {
      fetchQuestions();
    }
  };

  const handleAddAnswer = async (questionId, payload, isRefreshOnly = false) => {
    if (isRefreshOnly) {
      fetchQuestions();
      return;
    }
    const res = await fetch(`/api/qna/questions/${questionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    fetchQuestions();
  };

  const handleCreateQuestion = async (payload) => {
    const res = await fetch('/api/qna/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: 'default_session',
        ...payload
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    fetchQuestions();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        isConnected={isConnected}
        session={session}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-5">
        <QnaFeed
          questions={questions}
          counts={counts}
          loading={loading}
          userFingerprint={userFingerprint}
          onUpvote={handleUpvote}
          onAddAnswer={handleAddAnswer}
          onCreateQuestion={handleCreateQuestion}
          sort={sort}
          onSortChange={setSort}
          search={search}
          onSearchChange={setSearch}
        />
      </main>
    </div>
  );
}
