package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

// SessionTerminal provides direct access to the session's single instance terminal
func SessionTerminal(rw http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	sessionId := vars["sessionId"]

	session, err := core.SessionGet(sessionId)
	if err != nil {
		log.Printf("Session %s not found: %v\n", sessionId, err)
		rw.WriteHeader(http.StatusNotFound)
		return
	}

	// Get the single instance for this session
	instance, err := core.InstanceGetSingle(session)
	if err != nil {
		log.Printf("No instance found for session %s: %v\n", sessionId, err)
		rw.WriteHeader(http.StatusNotFound)
		json.NewEncoder(rw).Encode(map[string]string{
			"error":   "no_instance",
			"message": "No instance found for this session",
		})
		return
	}

	// Return the instance information
	json.NewEncoder(rw).Encode(instance)
}

// SessionTerminalWS handles WebSocket connections for the session's single instance
func SessionTerminalWS(rw http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	sessionId := vars["sessionId"]

	session, err := core.SessionGet(sessionId)
	if err != nil {
		log.Printf("Session %s not found: %v\n", sessionId, err)
		rw.WriteHeader(http.StatusNotFound)
		return
	}

	// Get the single instance for this session
	_, err = core.InstanceGetSingle(session)
	if err != nil {
		log.Printf("No instance found for session %s: %v\n", sessionId, err)
		rw.WriteHeader(http.StatusNotFound)
		return
	}

	// Use the existing WebSocket handler
	WSH(rw, req)
}
