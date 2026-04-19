import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAhIsaXavRTTNsIq3ypjkl13iubPPO7HRo",
  authDomain: "stayai-agent.firebaseapp.com",
  projectId: "stayai-agent",
  storageBucket: "stayai-agent.firebasestorage.app",
  messagingSenderId: "1057969054203",
  appId: "1:1057969054203:web:3b81a07ff35308157d2b5e"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const BACKEND_URL = 'http://192.168.1.104:3000';
const SESSION_ID = 'user-' + Math.random().toString(36).substr(2, 9);

const DESTINATIONS = ['Istanbul', 'Antalya', 'Izmir', 'Ankara', 'Bodrum', 'Cappadocia'];

const LISTINGS = [
  { id: 2, title: 'Minimalist Studio Kadıköy', city: 'Istanbul', price: 75, rating: 4.8, color: '#E8F4F8', icon: '🛋️' },
  { id: 7, title: 'Boğaz Manzaralı Daire', city: 'Istanbul', price: 120, rating: 4.9, color: '#FFF3E0', icon: '🌉' },
  { id: 8, title: 'Cozy Bosphorus Apartment', city: 'Istanbul', price: 120, rating: 4.7, color: '#F3E5F5', icon: '🏙️' },
  { id: 9, title: 'Seaside Villa Antalya', city: 'Antalya', price: 200, rating: 4.9, color: '#E8F5E9', icon: '🏖️' },
];

export default function App() {
  const [tab, setTab] = useState('explore');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, 'sessions', SESSION_ID, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    });
    return () => unsub();
  }, []);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);
    setTab('chat');
    try {
      await axios.post(`${BACKEND_URL}/chat`, { message: msg, sessionId: SESSION_ID }, { timeout: 30000 });
    } catch (err) {
      await addDoc(collection(db, 'sessions', SESSION_ID, 'messages'), {
        role: 'assistant', text: '❌ ' + err.message, timestamp: serverTimestamp()
      });
    } finally { setLoading(false); }
  };

  const reset = async () => {
    try { await axios.post(`${BACKEND_URL}/reset`, { sessionId: SESSION_ID }); } catch {}
  };

  // ── EXPLORE ────────────────────────────────────────────────────────────────
  const Explore = () => (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Hero Search */}
      <View style={S.heroSearch}>
        <View style={S.searchBox}>
          <Text style={S.searchIcon}>⌕</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search destinations..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => search && send(`Find listings in ${search} for 2 people`)}
          />
        </View>
      </View>

      {/* Destinations */}
      <Text style={S.sectionLabel}>Popular destinations</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {DESTINATIONS.map(d => (
          <TouchableOpacity key={d} style={S.destChip} onPress={() => send(`Find listings in ${d} for 2 people from 2025-08-01 to 2025-08-05`)}>
            <Text style={S.destChipText}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      <Text style={S.sectionLabel}>Featured stays</Text>
      {LISTINGS.map(l => (
        <View key={l.id} style={S.card}>
          <View style={[S.cardImage, { backgroundColor: l.color }]}>
            <Text style={{ fontSize: 52 }}>{l.icon}</Text>
          </View>
          <View style={S.cardBody}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={S.cardTitle} numberOfLines={1}>{l.title}</Text>
              <Text style={S.cardRating}>★ {l.rating}</Text>
            </View>
            <Text style={S.cardCity}>{l.city}, Turkey</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Text style={S.cardPrice}><Text style={S.cardPriceNum}>${l.price}</Text> / night</Text>
              <TouchableOpacity style={S.reserveBtn} onPress={() => send(`Book listing ID ${l.id} from 2025-08-01 to 2025-08-05 for guest Berker Vergi`)}>
                <Text style={S.reserveBtnText}>Reserve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
      <View style={{ height: 90 }} />
    </ScrollView>
  );

  // ── CHAT ───────────────────────────────────────────────────────────────────
  const Chat = () => (
    <View style={{ flex: 1, backgroundColor: '#fafafa' }}>
      {messages.length === 0 && !loading ? (
        <View style={S.emptyChat}>
          <Text style={{ fontSize: 42, marginBottom: 12 }}>✨</Text>
          <Text style={S.emptyChatTitle}>AI Stay Assistant</Text>
          <Text style={S.emptyChatSub}>Search listings, make bookings{'\n'}or review your stays</Text>
          <View style={{ gap: 10, marginTop: 24, width: '100%', paddingHorizontal: 24 }}>
            {[
              '🔍  Find a place in Istanbul for 2 people',
              '📅  Show my bookings',
              '⭐  Review my last stay'
            ].map((q, i) => (
              <TouchableOpacity key={i} style={S.suggestBtn} onPress={() => send(q.slice(3).trim())}>
                <Text style={S.suggestBtnText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isUser = item.role === 'user';
            return (
              <View style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                {!isUser && <View style={S.avatar}><Text style={{ fontSize: 16 }}>🤖</Text></View>}
                <View style={[S.bubble, isUser ? S.bubbleUser : S.bubbleBot]}>
                  <Text style={[S.bubbleText, { color: isUser ? '#fff' : '#222' }]}>{item.text}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {loading && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={S.avatar}><Text style={{ fontSize: 16 }}>🤖</Text></View>
          <View style={[S.bubble, S.bubbleBot, { flexDirection: 'row', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color="#FF385C" />
            <Text style={{ color: '#666', fontSize: 13, marginLeft: 8 }}>Searching...</Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={S.inputBar}>
          <TextInput
            style={S.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message AI assistant..."
            placeholderTextColor="#bbb"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[S.sendBtn, (!input.trim() || loading) && { backgroundColor: '#eee' }]}
            onPress={() => send()}
            disabled={!input.trim() || loading}
          >
            <Text style={{ color: input.trim() ? '#fff' : '#bbb', fontSize: 18, fontWeight: '700' }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  // ── TRIPS ──────────────────────────────────────────────────────────────────
  const Trips = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>🧳</Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 8 }}>Your trips</Text>
      <Text style={{ color: '#999', textAlign: 'center', marginBottom: 28, lineHeight: 20, paddingHorizontal: 40 }}>
        No upcoming trips yet.{'\n'}Start by searching for a place to stay.
      </Text>
      <TouchableOpacity style={S.tripsBtn} onPress={() => { send('Show my bookings'); }}>
        <Text style={S.tripsBtnText}>View bookings</Text>
      </TouchableOpacity>
    </View>
  );

  const TABS = [
    { key: 'explore', label: 'Explore', icon: '🔍' },
    { key: 'chat', label: 'Assistant', icon: '✨' },
    { key: 'trips', label: 'Trips', icon: '🧳' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={S.header}>
        <Text style={S.logo}>stayai</Text>
        {tab === 'chat' && (
          <TouchableOpacity onPress={reset} style={S.newChatBtn}>
            <Text style={S.newChatText}>New chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Screens */}
      <View style={{ flex: 1 }}>
        {tab === 'explore' && <Explore />}
        {tab === 'chat' && <Chat />}
        {tab === 'trips' && <Trips />}
      </View>

      {/* Tab Bar */}
      <View style={S.tabBar}>
        {TABS.map(t => {
          const active = tab === t.key;
          const isCenter = t.key === 'chat';
          return (
            <TouchableOpacity key={t.key} style={S.tabItem} onPress={() => setTab(t.key)}>
              {isCenter ? (
                <View style={[S.fabBtn, active && { backgroundColor: '#FF385C' }]}>
                  <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 22, opacity: active ? 1 : 0.4 }}>{t.icon}</Text>
                  <Text style={[S.tabLabel, active && { color: '#FF385C', opacity: 1 }]}>{t.label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  logo: { fontSize: 22, fontWeight: '800', color: '#FF385C', letterSpacing: -0.5 },
  newChatBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  newChatText: { fontSize: 13, color: '#444' },

  heroSearch: { paddingHorizontal: 16, paddingVertical: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f7f7', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, borderColor: '#ebebeb' },
  searchIcon: { fontSize: 18, color: '#888', marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#222' },

  sectionLabel: { fontSize: 17, fontWeight: '700', color: '#222', marginHorizontal: 16, marginTop: 4, marginBottom: 12 },

  destChip: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#f7f7f7', borderRadius: 22, borderWidth: 1, borderColor: '#ebebeb' },
  destChipText: { fontSize: 13, fontWeight: '600', color: '#333' },

  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebebeb', overflow: 'hidden' },
  cardImage: { height: 180, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 14 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#222', marginRight: 8 },
  cardRating: { fontSize: 13, fontWeight: '600', color: '#FF385C' },
  cardCity: { fontSize: 13, color: '#888', marginTop: 3 },
  cardPrice: { fontSize: 13, color: '#666' },
  cardPriceNum: { fontSize: 17, fontWeight: '700', color: '#222' },
  reserveBtn: { backgroundColor: '#FF385C', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  reserveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyChatTitle: { fontSize: 22, fontWeight: '700', color: '#222', marginBottom: 8 },
  emptyChatSub: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 21 },
  suggestBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebebeb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
  suggestBtnText: { fontSize: 14, color: '#333' },

  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF0F3', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  bubbleUser: { backgroundColor: '#FF385C', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ebebeb', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  input: { flex: 1, backgroundColor: '#f7f7f7', color: '#222', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, marginRight: 8, borderWidth: 1, borderColor: '#ebebeb' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF385C', justifyContent: 'center', alignItems: 'center' },

  tripsBtn: { borderWidth: 1, borderColor: '#222', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  tripsBtnText: { fontSize: 15, fontWeight: '600', color: '#222' },

  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fabBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginTop: -20, borderWidth: 3, borderColor: '#fff' },
  tabLabel: { fontSize: 10, color: '#aaa', marginTop: 3, fontWeight: '500' },
});
