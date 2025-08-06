#!/bin/bash

# Quick fix for Docker Swarm initialization
# Run this if you get "This node is not a swarm manager" error

echo "🔧 Docker Swarm Quick Fix"
echo "========================="

if docker node ls >/dev/null 2>&1; then
    echo "✅ Docker Swarm is already initialized"
else
    echo "🚀 Initializing Docker Swarm..."
    docker swarm init
    echo "✅ Docker Swarm initialized successfully!"
fi

echo
echo "Now try creating a new environment in the playground!"
