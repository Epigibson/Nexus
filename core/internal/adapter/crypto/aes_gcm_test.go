package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"io"
	"testing"
)

func TestEncryptDecryptRoundtrip(t *testing.T) {
	svc := NewAESGCMService()

	// Initialize with master password
	if err := svc.Initialize("my-super-secret-password-2026"); err != nil {
		t.Fatalf("Initialize failed: %v", err)
	}

	if !svc.IsInitialized() {
		t.Fatal("expected service to be initialized")
	}

	// Test various payloads
	testCases := []struct {
		name      string
		plaintext string
	}{
		{"empty", ""},
		{"short", "hello"},
		{"api_key", "sk-proj-abc123def456ghi789"},
		{"json_config", `{"database_url":"postgresql://user:pass@host:5432/db","api_key":"secret123"}`},
		{"unicode", "contraseña segura 🔐 con émojis"},
		{"long", string(make([]byte, 10000))},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			ciphertext, err := svc.Encrypt([]byte(tc.plaintext))
			if err != nil {
				t.Fatalf("Encrypt failed: %v", err)
			}

			// Ciphertext should be different from plaintext
			if tc.plaintext != "" && hex.EncodeToString(ciphertext) == hex.EncodeToString([]byte(tc.plaintext)) {
				t.Fatal("ciphertext should differ from plaintext")
			}

			decrypted, err := svc.Decrypt(ciphertext)
			if err != nil {
				t.Fatalf("Decrypt failed: %v", err)
			}

			if string(decrypted) != tc.plaintext {
				t.Fatalf("roundtrip failed: got %q, want %q", string(decrypted), tc.plaintext)
			}
		})
	}
}

func TestDifferentPasswordsFail(t *testing.T) {
	svc1 := NewAESGCMService()
	svc1.Initialize("password-one")
	salt := svc1.GetSalt()

	ciphertext, _ := svc1.Encrypt([]byte("secret data"))

	// Try to decrypt with different password but same salt
	svc2 := NewAESGCMService()
	svc2.InitializeWithSalt("wrong-password", salt)

	_, err := svc2.Decrypt(ciphertext)
	if err == nil {
		t.Fatal("expected decryption to fail with wrong password")
	}
}

func TestSameSaltSameKey(t *testing.T) {
	svc1 := NewAESGCMService()
	svc1.Initialize("same-password")
	salt := svc1.GetSalt()

	ciphertext, _ := svc1.Encrypt([]byte("important secret"))

	// Same password + same salt = same key → successful decryption
	svc2 := NewAESGCMService()
	svc2.InitializeWithSalt("same-password", salt)

	decrypted, err := svc2.Decrypt(ciphertext)
	if err != nil {
		t.Fatalf("Decrypt with same password+salt should work: %v", err)
	}
	if string(decrypted) != "important secret" {
		t.Fatalf("got %q, want %q", string(decrypted), "important secret")
	}
}

func TestUniqueNonces(t *testing.T) {
	svc := NewAESGCMService()
	svc.Initialize("test-password")

	// Same plaintext should produce different ciphertexts (different nonces)
	ct1, _ := svc.Encrypt([]byte("same data"))
	ct2, _ := svc.Encrypt([]byte("same data"))

	if hex.EncodeToString(ct1) == hex.EncodeToString(ct2) {
		t.Fatal("same plaintext should produce different ciphertexts due to random nonces")
	}
}

func TestNotInitialized(t *testing.T) {
	svc := NewAESGCMService()

	_, err := svc.Encrypt([]byte("test"))
	if err == nil {
		t.Fatal("expected error when not initialized")
	}

	_, err = svc.Decrypt([]byte("test"))
	if err == nil {
		t.Fatal("expected error when not initialized")
	}
}

func TestWipe(t *testing.T) {
	svc := NewAESGCMService()
	svc.Initialize("password")
	svc.Wipe()

	if svc.IsInitialized() {
		t.Fatal("expected service to not be initialized after wipe")
	}
}

// Suppress unused import warnings — these are used in the main module
var _ = aes.NewCipher
var _ = cipher.NewGCM
var _ = rand.Reader
var _ = io.ReadFull
