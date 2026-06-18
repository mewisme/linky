package rooms

import "testing"

func TestRoomServiceCreateIndexesAndRemove(t *testing.T) {
	t.Parallel()
	rs := NewService()
	p1 := Participant{UserID: "u1", SocketID: "s1", UserName: "One"}
	p2 := Participant{UserID: "u2", SocketID: "s2", UserName: "Two"}

	room := rs.Create(p1, p2)
	if room.ID == "" {
		t.Fatal("expected generated room ID")
	}
	if rs.ByID(room.ID) != room {
		t.Fatal("expected room to be indexed by ID")
	}
	if rs.BySocket("s1") != room || rs.BySocket("s2") != room {
		t.Fatal("expected room to be indexed by both sockets")
	}
	if rs.ByUser("u1") != room || rs.ByUser("u2") != room {
		t.Fatal("expected room to be indexed by both users")
	}
	if len(rs.All()) != 1 {
		t.Fatalf("All() length = %d, want 1", len(rs.All()))
	}

	removed := rs.Remove(room.ID)
	if removed != room {
		t.Fatal("expected Remove to return the removed room")
	}
	if rs.ByID(room.ID) != nil || rs.BySocket("s1") != nil || rs.ByUser("u1") != nil {
		t.Fatal("expected room indexes to be cleared after remove")
	}
	if got := rs.Remove(room.ID); got != nil {
		t.Fatal("expected removing missing room to return nil")
	}
}

func TestRoomServicePeerOfAndReplaceSocket(t *testing.T) {
	t.Parallel()
	rs := NewService()
	room := rs.Create(
		Participant{UserID: "u1", SocketID: "old", UserName: "One"},
		Participant{UserID: "u2", SocketID: "peer", UserName: "Two"},
	)

	peer, peerRoom := rs.PeerOf("old")
	if peerRoom != room || peer == nil || peer.SocketID != "peer" {
		t.Fatalf("PeerOf(old) = (%v, %v), want peer socket", peer, peerRoom)
	}
	if peer, peerRoom := rs.PeerOf("missing"); peer != nil || peerRoom != nil {
		t.Fatalf("PeerOf(missing) = (%v, %v), want nils", peer, peerRoom)
	}

	if !rs.ReplaceSocket(room.ID, "old", "new") {
		t.Fatal("expected ReplaceSocket to update existing socket")
	}
	if rs.BySocket("old") != nil {
		t.Fatal("old socket index should be removed")
	}
	if rs.BySocket("new") != room {
		t.Fatal("new socket should point to room")
	}
	if room.Participants[0].SocketID != "new" {
		t.Fatalf("participant socket = %q, want new", room.Participants[0].SocketID)
	}
	if rs.ReplaceSocket("missing", "new", "next") {
		t.Fatal("expected missing room replacement to fail")
	}
	if rs.ReplaceSocket(room.ID, "absent", "next") {
		t.Fatal("expected absent socket replacement to fail")
	}
}
