package task

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/play-with-docker/play-with-docker/event"
	"github.com/play-with-docker/play-with-docker/pwd/types"
	"github.com/play-with-docker/play-with-docker/storage"
)

type sessionTimer struct {
	event        event.EventApi
	storage      storage.StorageApi
	activeTimers map[string]context.CancelFunc
	mutex        sync.Mutex
}

var SessionTimerEvent event.EventType

func init() {
	SessionTimerEvent = event.EventType("session timer")
}

func (t *sessionTimer) Name() string {
	return "SessionTimer"
}

func (t *sessionTimer) Run(ctx context.Context, instance *types.Instance) error {
	log.Printf("DEBUG: Starting session timer for instance %s (SessionId: %s)\n", instance.Name, instance.SessionId)
	
	t.mutex.Lock()
	defer t.mutex.Unlock()
	
	// Check if we already have a timer running for this session
	if _, exists := t.activeTimers[instance.SessionId]; exists {
		// Timer already running for this session
		return nil
	}
	
	// Create a new context for this timer
	timerCtx, cancel := context.WithCancel(ctx)
	t.activeTimers[instance.SessionId] = cancel
	
	// Start the timer in a separate goroutine
	go t.runTimer(timerCtx, instance.SessionId)
	
	return nil
}

func (t *sessionTimer) runTimer(ctx context.Context, sessionId string) {
	defer func() {
		t.mutex.Lock()
		delete(t.activeTimers, sessionId)
		t.mutex.Unlock()
		log.Printf("DEBUG: Session timer stopped for session %s\n", sessionId)
	}()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	log.Printf("DEBUG: Session timer goroutine started for session %s\n", sessionId)
	
	for {
		select {
		case <-ctx.Done():
			log.Printf("DEBUG: Session timer context cancelled for session %s\n", sessionId)
			return
		case <-ticker.C:
			// Get the session for this timer
			session, err := t.storage.SessionGet(sessionId)
			if err != nil {
				if storage.NotFound(err) {
					// Session doesn't exist anymore, stop timer
					log.Printf("DEBUG: Session %s not found, stopping timer\n", sessionId)
					return
				}
				log.Printf("Error getting session %s for timer: %v\n", sessionId, err)
				continue
			}

			now := time.Now()
			
			// Calculate remaining time
			remaining := session.ExpiresAt.Sub(now)
			
			// If session has expired, stop timer
			if remaining <= 0 {
				log.Printf("DEBUG: Session %s expired, stopping timer\n", sessionId)
				return
			}

			// Format remaining time as HH:MM:SS
			hours := int(remaining.Hours())
			minutes := int(remaining.Minutes()) % 60
			seconds := int(remaining.Seconds()) % 60
			
			timeString := ""
			if hours > 0 {
				timeString = fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
			} else {
				timeString = fmt.Sprintf("%02d:%02d", minutes, seconds)
			}

			// Emit the timer event to the session
			log.Printf("DEBUG: Emitting session timer event for session %s: %s\n", sessionId, timeString)
			t.event.Emit(SessionTimerEvent, sessionId, timeString)
		}
	}
}

func NewSessionTimer(e event.EventApi, s storage.StorageApi) *sessionTimer {
	return &sessionTimer{
		event:        e,
		storage:      s,
		activeTimers: make(map[string]context.CancelFunc),
	}
}
