(function() {
  'use strict';

  var app = angular.module('DockerPlay', ['ngMaterial', 'ngFileUpload', 'ngclipboard']);

  app.controller('PlayController', ['$scope', '$rootScope', '$log', '$http', '$location', '$timeout', '$mdDialog', '$window', 'TerminalService', 'KeyboardShortcutService', 'InstanceService', 'SessionService', 'Upload', function($scope, $rootScope, $log, $http, $location, $timeout, $mdDialog, $window, TerminalService, KeyboardShortcutService, InstanceService, SessionService, Upload) {
    
    // Initialize scope variables
    $scope.sessionId = SessionService.getCurrentSessionId();
    $scope.host = window.location.host;
    $scope.instance = null; // Single instance instead of array
    $scope.isAlive = true;
    $scope.ttl = '--:--:--';
    $scope.connected = false;
    $scope.uploadProgress = 0;
    $scope.uploadMessage = '';
    
    // Editor variables
    $scope.openFiles = [];
    $scope.currentFile = null;
    $scope.fileCounter = 1;
    
    // File upload functionality
    $scope.uploadFiles = function (files, invalidFiles) {
        if (!$scope.instance) {
            $scope.showAlert('No Container', 'Please wait for your Docker container to be ready.');
            return;
        }
        
        let total = files.length;
        let uploadFile = function() {
            let file = files.shift();
            if (!file) {
                $scope.uploadMessage = "";
                $scope.uploadProgress = 0;
                return;
            }
            
            $scope.uploadMessage = "Uploading file(s) " + (total - files.length) + "/" + total + " : " + file.name;
            let upload = Upload.upload({
                url: '/sessions/' + $scope.sessionId + '/instances/' + $scope.instance.name + '/uploads', 
                data: {file: file}, 
                method: 'POST'
            }).then(function(){}, function(){}, function(evt) {
                $scope.uploadProgress = parseInt(100.0 * evt.loaded / evt.total);
            });

            upload.finally(uploadFile);
        };

        uploadFile();
    };

    // Window resize handler for terminal
    var selectedKeyboardShortcuts = KeyboardShortcutService.getCurrentShortcuts();
    $scope.resizeHandler = null;

    angular.element($window).bind('resize', function() {
        if ($scope.instance && $scope.instance.term) {
            if (!$scope.resizeHandler) {
                $scope.resizeHandler = $timeout(function() {
                    $scope.resizeHandler = null;
                    $scope.resize($scope.instance.term.proposeGeometry());
                }, 1000);
            }
        }
    });

    $scope.$on("settings:shortcutsSelected", function(e, preset) {
        selectedKeyboardShortcuts = preset;
    });

    // Show alert dialog
    $scope.showAlert = function(title, content, parent, cb) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.querySelector(parent || 'body')))
            .clickOutsideToClose(true)
            .title(title)
            .textContent(content)
            .ok('Got it!')
        ).finally(function() {
            if (cb) {
                cb();
            }
        });
    };

    // Terminal resize function
    $scope.resize = function(geometry) {
        if ($scope.socket) {
            $scope.socket.emit('instance viewport resize', geometry.cols, geometry.rows);
        }
    };

    KeyboardShortcutService.setResizeFunc($scope.resize);

    // Session builder modal controller
    function SessionBuilderModalController($mdDialog, $scope) {
        $scope.createBuilderTerminal();
        $scope.closeSessionBuilder = function() {
            $mdDialog.cancel();
        };
    }

    // Set session state for stack deployment
    $scope.setSessionState = function(state) {
        $scope.ready = state;

        if (!state) {
            $mdDialog.show({
                onComplete: function(){SessionBuilderModalController($mdDialog, $scope)},
                contentElement: '#builderDialog',
                parent: angular.element(document.body),
                clickOutsideToClose: false,
                scope: $scope,
                preserveScope: true
            });
        }
    };

    // Load playground configuration
    $scope.loadPlaygroundConf = function() {
        $http({
            method: 'GET',
            url: '/my/playground',
        }).then(function(response) {
            $scope.playground = response.data;
        });
    };

    // Get session and its single instance
    $scope.getSession = function() {
        $http({
            method: 'GET',
            url: '/sessions/' + $scope.sessionId,
        }).then(function(response) {
            var session = response.data;
            
            // In the simplified model, there should be exactly one instance
            var instances = [];
            if (session.instances) {
                // Use more compatible approach instead of Object.values()
                for (var key in session.instances) {
                    if (session.instances.hasOwnProperty(key)) {
                        instances.push(session.instances[key]);
                    }
                }
            }
            
            if (instances.length > 0) {
                $scope.instance = instances[0];
                $scope.instance.ports = $scope.instance.ports || [];
                $scope.instance.swarmPorts = $scope.instance.swarmPorts || [];
                $scope.setupInstance($scope.instance);
                $scope.$apply();  // Force Angular to update the view
            } else {
                // Instance might not be ready yet, wait and retry
                $timeout(function() {
                    $scope.getSession();
                }, 2000);
            }
        }, function(response) {
            if (response.status === 404) {
                $scope.showAlert('Session Not Found', 'This session no longer exists.', null, function() {
                    window.location.href = '/';
                });
            }
        });
    };

    // Setup a single instance
    $scope.setupInstance = function(instance) {
        if (!instance.term) {
            // Create terminal for the instance
            $scope.attachTerminal(instance);
        }
    };

    // Close session
    $scope.closeSession = function() {
        $http({
            method: 'POST',
            url: '/sessions/' + $scope.sessionId + '/close',
        }).then(function() {
            window.location.href = '/';
        });
    };

    // Open port dialog
    $scope.openPort = function(instance) {
        var prompt = $mdDialog.prompt()
            .title('Open Port')
            .textContent('Enter the port number you want to open:')
            .placeholder('Port number (e.g., 8080)')
            .ok('Open')
            .cancel('Cancel');

        $mdDialog.show(prompt).then(function(port) {
            if (port && !isNaN(port)) {
                var url = $scope.getProxyUrl(instance, port);
                window.open(url, '_blank');
            }
        });
    };

    // Open editor
    $scope.openEditor = function(instance) {
        if (instance) {
            var url = '/sessions/' + $scope.sessionId + '/instances/' + instance.name + '/editor';
            window.open(url, '_blank');
        }
    };

    // Get proxy URL for port
    $scope.getProxyUrl = function(instance, port) {
        if (!instance) return '';
        var protocol = (port == 443 || port == 8443) ? 'https' : 'http';
        return protocol + '://' + instance.proxy_host + '-' + port + '.' + $scope.host;
    };

    // ===== EMBEDDED EDITOR FUNCTIONS =====
    
    // Create a new file
    $scope.createNewFile = function() {
        var fileName = 'Untitled-' + $scope.fileCounter + '.txt';
        $scope.fileCounter++;
        
        var newFile = {
            name: fileName,
            content: '# Welcome to Docker Playground!\n# Write your code here and test it in the terminal\n\n',
            isNew: true,
            isDirty: false
        };
        
        $scope.openFiles.push(newFile);
        $scope.selectFile(newFile);
    };
    
    // Select a file to edit
    $scope.selectFile = function(file) {
        $scope.currentFile = file;
    };
    
    // Close a file
    $scope.closeFile = function(file, event) {
        if (event) {
            event.stopPropagation();
        }
        
        var index = $scope.openFiles.indexOf(file);
        if (index > -1) {
            $scope.openFiles.splice(index, 1);
            
            if ($scope.currentFile === file) {
                if ($scope.openFiles.length > 0) {
                    $scope.currentFile = $scope.openFiles[Math.max(0, index - 1)];
                } else {
                    $scope.currentFile = null;
                }
            }
        }
    };
    
    // Save current file to container
    $scope.saveFile = function() {
        if (!$scope.currentFile || !$scope.instance) {
            return;
        }
        
        var fileName = $scope.currentFile.name;
        var content = $scope.currentFile.content;
        
        // Create the file content and save it via terminal commands
        var sanitizedContent = content.replace(/'/g, "'\"'\"'"); // Escape single quotes
        var command = "cat > '" + fileName + "' << 'DOCKER_PLAYGROUND_EOF'\n" + content + "\nDOCKER_PLAYGROUND_EOF\n";
        
        // Send command to terminal
        if ($scope.socket) {
            $scope.socket.emit('instance terminal in', $scope.instance.name, command);
            
            // Show success message
            $scope.showAlert('File Saved', 'File "' + fileName + '" has been saved to the container.');
            
            $scope.currentFile.isNew = false;
            $scope.currentFile.isDirty = false;
        }
    };
    
    // Create sample files for Docker learning
    $scope.createSampleFiles = function() {
        // Dockerfile sample
        var dockerfileContent = `# Sample Dockerfile
FROM alpine:latest

# Install basic tools
RUN apk add --no-cache curl wget

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Set default command
CMD ["echo", "Hello from Docker!"]
`;

        // Docker Compose sample
        var dockerComposeContent = `version: '3.8'

services:
  web:
    build: .
    ports:
      - "8080:80"
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
`;

        // Python sample
        var pythonContent = `#!/usr/bin/env python3
"""
Sample Python script for Docker playground
"""

import os
import sys

def main():
    print("🐳 Hello from Docker Playground!")
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    print(f"Files in current directory:")
    
    for file in os.listdir('.'):
        print(f"  - {file}")

if __name__ == "__main__":
    main()
`;

        // Add sample files
        $scope.openFiles = [
            {
                name: 'Dockerfile',
                content: dockerfileContent,
                isNew: false,
                isDirty: false
            },
            {
                name: 'docker-compose.yml', 
                content: dockerComposeContent,
                isNew: false,
                isDirty: false
            },
            {
                name: 'app.py',
                content: pythonContent,
                isNew: false,
                isDirty: false
            }
        ];
        
        $scope.currentFile = $scope.openFiles[0];
        $scope.fileCounter = 4;
    };

    // Attach terminal to instance
    $scope.attachTerminal = function(instance) {
        TerminalService.attachTerminal(instance, $scope.sessionId, selectedKeyboardShortcuts, function() {
            // Terminal ready callback
            if (instance.buffer) {
                instance.term.write(instance.buffer);
                instance.buffer = '';
            }
            
            // Add terminal input handler to send data through main WebSocket
            instance.term.on('data', function(data) {
                if ($scope.socket) {
                    $scope.socket.emit('instance terminal in', instance.name, data);
                }
            });
        });
    };

    // Socket.IO connection - replaced with custom WebSocket implementation
    $scope.connect = function() {
        // Set up custom WebSocket similar to app.js
        var base = '';
        if (window.location.protocol == 'http:') {
            base = 'ws://';
        } else {
            base = 'wss://';
        }
        base += window.location.host;

        var socket = new ReconnectingWebSocket(base + '/sessions/' + $scope.sessionId + '/ws/', null, {reconnectInterval: 1000});
        socket.listeners = {};

        socket.on = function(name, cb) {
            if (!socket.listeners[name]) {
                socket.listeners[name] = [];
            }
            socket.listeners[name].push(cb);
        }

        socket.emit = function() {
            var name = arguments[0]
            var args = [];
            for (var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            socket.send(JSON.stringify({name: name, args: args}));
        }

        socket.addEventListener('open', function (event) {
            $scope.connected = true;
            $scope.$apply();
            
            // Trigger connect event for compatibility
            var ls = socket.listeners['connect'];
            if (ls) {
                for (var i=0; i<ls.length; i++) {
                    var l = ls[i];
                    l.apply(l, []);
                }
            }
        });

        socket.addEventListener('close', function (event) {
            $scope.connected = false;
            $scope.$apply();
            
            // Trigger disconnect event for compatibility
            var ls = socket.listeners['disconnect'];
            if (ls) {
                for (var i=0; i<ls.length; i++) {
                    var l = ls[i];
                    l.apply(l, []);
                }
            }
        });

        socket.addEventListener('message', function (event) {
            var m = JSON.parse(event.data);
            var ls = socket.listeners[m.name];
            if (ls) {
                for (var i=0; i<ls.length; i++) {
                    var l = ls[i];
                    l.apply(l, m.args);
                }
            }
        });
        
        
        $scope.socket = socket;
        
        $scope.socket.on('connect', function() {
            $scope.connected = true;
            $scope.$apply();
        
            // Join session room
            $scope.socket.emit('session', $scope.sessionId);
            
            // Load session data
            $scope.getSession();
            $scope.loadPlaygroundConf();
        });        $scope.socket.on('disconnect', function() {
            $scope.connected = false;
            $scope.$apply();
        });

        // Session events
        $scope.socket.on('session ready', function(ready) {
            $scope.setSessionState(ready);
        });

        $scope.socket.on('session builder out', function(data) {
            if ($scope.builderTerminal) {
                $scope.builderTerminal.write(data);
            }
        });

        $scope.socket.on('session end', function() {
            $scope.showAlert('Session Expired', 'Your session has expired and your container has been deleted.', null, function() {
                window.location.href = '/';
            });
            $scope.isAlive = false;
            $scope.socket.close();
        });

        // Instance events (simplified for single instance)
        $scope.socket.on('instance new', function(name, ip, hostname, proxyHost) {
            // Auto-setup the single instance
            var instance = {
                name: name,
                ip: ip,
                hostname: hostname,
                proxy_host: proxyHost,
                session_id: $scope.sessionId,
                ports: [],
                swarmPorts: [],
                buffer: ''
            };
            
            $scope.instance = instance;
            $scope.$apply();
            
            // Setup instance after DOM update
            $timeout(function() {
                $scope.setupInstance(instance);
            }, 50);
        });

        $scope.socket.on('instance delete', function(name) {
            if ($scope.instance && $scope.instance.name === name) {
                $scope.instance = null;
                $scope.$apply();
            }
        });

        $scope.socket.on('instance viewport resize', function(cols, rows) {
            if (cols == 0 || rows == 0) return;
            
            if ($scope.instance && $scope.instance.term) {
                $scope.instance.term.resize(cols, rows);
                if ($scope.instance.buffer) {
                    $scope.instance.term.write($scope.instance.buffer);
                    $scope.instance.buffer = '';
                }
            }
        });

        $scope.socket.on('instance stats', function(stats) {
            if ($scope.instance && $scope.instance.name === stats.instance) {
                $scope.instance.mem = stats.mem;
                $scope.instance.cpu = stats.cpu;
                $scope.$apply();
            }
        });

        $scope.socket.on('instance terminal status', function(name, status) {
            if ($scope.instance && $scope.instance.name === name) {
                $scope.instance.status = status;
                $scope.$apply();
            }
        });

        $scope.socket.on('instance terminal out', function(name, data) {
            if ($scope.instance && $scope.instance.name === name) {
                if (!$scope.instance.term) {
                    $scope.instance.buffer += data;
                } else {
                    $scope.instance.term.write(data);
                }
            }
        });

        // Port and swarm events
        $scope.socket.on('instance port', function(sessionId, instanceName, port) {
            if ($scope.instance && $scope.instance.name === instanceName) {
                if ($scope.instance.ports.indexOf(port) === -1) {
                    $scope.instance.ports.push(port);
                    $scope.$apply();
                }
            }
        });

        $scope.socket.on('instance swarm port', function(sessionId, instanceName, port) {
            if ($scope.instance && $scope.instance.name === instanceName) {
                if ($scope.instance.swarmPorts.indexOf(port) === -1) {
                    $scope.instance.swarmPorts.push(port);
                    $scope.$apply();
                }
            }
        });

        // Session timer
        $scope.socket.on('session timer', function(time) {
            $scope.ttl = time;
            $scope.$apply();
        });
    };

    // Builder terminal for stack deployment
    $scope.createBuilderTerminal = function() {
        $scope.builderTerminal = new Terminal({
            cursorBlink: true,
            fontSize: 13
        });
        
        $scope.builderTerminal.open(document.getElementById('terminal-builder'));
        $scope.builderTerminal.fit();
    };

    // Initialize connection
    $scope.connect();

    // Cleanup on destroy
    $scope.$on('$destroy', function() {
        if ($scope.socket) {
            $scope.socket.disconnect();
        }
    });

  }]);

  // Services (simplified versions)
  app.service('SessionService', function() {
    this.getCurrentSessionId = function() {
      return window.location.pathname.split('/').pop();
    };
  });

  app.service('InstanceService', function() {
    this.getDesiredImage = function() {
      return 'franela/dind'; // Default DIND image
    };
  });

  app.service('TerminalService', ['$log', '$timeout', function($log, $timeout) {
    this.attachTerminal = function(instance, sessionId, shortcuts, callback) {
      if (instance.term) {
        return; // Already attached
      }

      instance.term = new Terminal({
        cursorBlink: true,
        fontSize: 13
      });

      // Wait a bit for DOM to be ready, then try to attach
      $timeout(function() {
        var terminalContainer = document.getElementById('terminal-' + instance.name);
        if (terminalContainer) {
          instance.term.open(terminalContainer);
          instance.term.fit();

          // Don't create a new WebSocket - terminal data comes through the main socket
          // The terminal output is handled by 'instance terminal out' events in the main controller

          if (callback) {
            callback();
          }
        } else {
          $log.error('Terminal container not found for instance:', instance.name);
        }
      }, 100);
    };
  }]);

  app.service('KeyboardShortcutService', function() {
    var resizeFunc = null;
    
    this.setResizeFunc = function(func) {
      resizeFunc = func;
    };
    
    this.getCurrentShortcuts = function() {
      return {}; // Simplified - no custom shortcuts
    };
  });

})();
