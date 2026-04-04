package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"errors"
	"fmt"
	"io"

	"golang.org/x/crypto/argon2"
)

// AESGCMService implements CryptoService using AES-256-GCM with Argon2id key derivation.
// This provides Zero-Knowledge encryption: the server never sees plaintext or the master key.
type AESGCMService struct {
	derivedKey []byte // 32-byte AES key derived from master password
	salt       []byte // 16-byte salt for Argon2id
}

// Argon2id parameters (OWASP recommended)
const (
	argonTime    = 3      // iterations
	argonMemory  = 64 * 1024 // 64 MB
	argonThreads = 4      // parallelism
	argonKeyLen  = 32     // AES-256
	saltLen      = 16     // salt length
	nonceLen     = 12     // GCM standard nonce
)

// NewAESGCMService creates a new uninitialized crypto service.
func NewAESGCMService() *AESGCMService {
	return &AESGCMService{}
}

// IsInitialized checks if a master key has been derived.
func (s *AESGCMService) IsInitialized() bool {
	return len(s.derivedKey) == argonKeyLen
}

// Initialize derives an AES-256 key from the master password using Argon2id.
// The salt is generated randomly and must be stored alongside the ciphertext.
func (s *AESGCMService) Initialize(masterPassword string) error {
	if masterPassword == "" {
		return errors.New("master password cannot be empty")
	}

	// Generate random salt
	salt := make([]byte, saltLen)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return fmt.Errorf("failed to generate salt: %w", err)
	}

	s.salt = salt
	s.derivedKey = argon2.IDKey(
		[]byte(masterPassword),
		salt,
		argonTime,
		argonMemory,
		argonThreads,
		argonKeyLen,
	)
	return nil
}

// InitializeWithSalt derives the key using an existing salt (for decryption).
func (s *AESGCMService) InitializeWithSalt(masterPassword string, salt []byte) error {
	if masterPassword == "" {
		return errors.New("master password cannot be empty")
	}
	if len(salt) != saltLen {
		return fmt.Errorf("invalid salt length: want %d, got %d", saltLen, len(salt))
	}

	s.salt = salt
	s.derivedKey = argon2.IDKey(
		[]byte(masterPassword),
		salt,
		argonTime,
		argonMemory,
		argonThreads,
		argonKeyLen,
	)
	return nil
}

// GetSalt returns the current salt (needed to store alongside ciphertext).
func (s *AESGCMService) GetSalt() []byte {
	return s.salt
}

// Encrypt encrypts plaintext using AES-256-GCM.
// Output format: [12-byte nonce][ciphertext+tag]
func (s *AESGCMService) Encrypt(plaintext []byte) ([]byte, error) {
	if !s.IsInitialized() {
		return nil, errors.New("crypto service not initialized — call Initialize first")
	}

	block, err := aes.NewCipher(s.derivedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := make([]byte, nonceLen)
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("failed to generate nonce: %w", err)
	}

	// Seal appends the ciphertext+tag to nonce
	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

// Decrypt decrypts AES-256-GCM ciphertext.
// Input format: [12-byte nonce][ciphertext+tag]
func (s *AESGCMService) Decrypt(ciphertext []byte) ([]byte, error) {
	if !s.IsInitialized() {
		return nil, errors.New("crypto service not initialized — call Initialize first")
	}

	if len(ciphertext) < nonceLen {
		return nil, errors.New("ciphertext too short")
	}

	block, err := aes.NewCipher(s.derivedKey)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create GCM: %w", err)
	}

	nonce := ciphertext[:nonceLen]
	encrypted := ciphertext[nonceLen:]

	plaintext, err := gcm.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed (wrong password or corrupted data): %w", err)
	}

	return plaintext, nil
}

// Wipe zeros out the derived key from memory (call on shutdown).
func (s *AESGCMService) Wipe() {
	for i := range s.derivedKey {
		s.derivedKey[i] = 0
	}
	s.derivedKey = nil
}
