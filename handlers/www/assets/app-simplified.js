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

    // Cheat Sheet data
    $scope.cheatSheet = [
        {
            id: 'verify',
            title: 'Getting Started',
            subtitle: 'Check version, info and hello-world',
            commands: [
                { title: 'Docker version', description: 'Check client and server version', command: 'docker version', explainer: 'Shows the Docker client and server versions and API compatibility.', sampleOutput: 'Client: Docker Engine - Community\n Version:           24.x\nServer: Docker Engine - Community\n Engine:\n  Version:          24.x' },
                { title: 'Docker info', description: 'Detailed information about Docker and system', command: 'docker info', explainer: 'Displays system-wide information such as number of containers, images, storage driver, and cgroup details.', sampleOutput: 'Containers: 0\n Images: 2\n Storage Driver: overlay2\n Logging Driver: json-file' },
                { title: 'Hello-world test', description: 'Run the classic hello-world image to verify setup', command: 'docker run --rm hello-world', explainer: 'Runs a minimal image that prints a welcome message and exits, verifying pulls and runs work.', sampleOutput: 'Hello from Docker!\nThis message shows that your installation appears to be working correctly.' },
                { title: 'System cleanup', description: 'Remove unused images and containers', command: 'docker system prune -f', explainer: 'Removes all unused containers, networks, and dangling images to free up space.', sampleOutput: 'Deleted Containers:\nabc123...\nTotal reclaimed space: 1.2GB' }
            ]
        },
        {
            id: 'images',
            title: 'Working with Images',
            subtitle: 'Pull, list, build, and manage images',
            commands: [
                { title: 'List images', description: 'Show all local images', command: 'docker images', explainer: 'Lists locally cached images with REPOSITORY, TAG, and SIZE columns.', sampleOutput: 'REPOSITORY   TAG       IMAGE ID       CREATED      SIZE\nalpine       latest    1b8b...        2 weeks ago  5.6MB' },
                { title: 'Pull Alpine Linux', description: 'Download a small Linux image', command: 'docker pull alpine:latest', explainer: 'Fetches the latest Alpine Linux image from Docker Hub.', sampleOutput: 'latest: Pulling from library/alpine\nDigest: sha256:...\nStatus: Downloaded newer image for alpine:latest' },
                { title: 'Pull Ubuntu', description: 'Download Ubuntu image', command: 'docker pull ubuntu:20.04', explainer: 'Downloads a specific version of Ubuntu for containers that need more packages.', sampleOutput: '20.04: Pulling from library/ubuntu\nDigest: sha256:...\nStatus: Downloaded newer image for ubuntu:20.04' },
                { title: 'Pull Python runtime', description: 'Download Python 3.9 image', command: 'docker pull python:3.9-slim', explainer: 'Gets a Python runtime environment for running Python applications.', sampleOutput: '3.9-slim: Pulling from library/python\nDigest: sha256:...\nStatus: Downloaded newer image for python:3.9-slim' },
                { title: 'Search Docker Hub', description: 'Search for nginx images', command: 'docker search nginx', explainer: 'Searches Docker Hub for images matching the query term.', sampleOutput: 'NAME       DESCRIPTION                     STARS     OFFICIAL   AUTOMATED\nnginx      Official build of Nginx         15000     [OK]' },
                { title: 'Inspect image details', description: 'Show metadata for alpine', command: 'docker inspect alpine:latest', explainer: 'Prints detailed JSON metadata for the image including layers, environment variables, and configuration.', sampleOutput: '[\n  {\n    "Id": "sha256:...",\n    "RepoTags": [\n      "alpine:latest"' },
                { title: 'Image history', description: 'Show image layer history', command: 'docker history alpine:latest', explainer: 'Shows how the image was built, layer by layer.', sampleOutput: 'IMAGE        CREATED      CREATED BY                      SIZE\n1b8b...      2 weeks ago  /bin/sh -c #(nop) CMD ["sh"]   0B' },
                { title: 'Remove image', description: 'Delete an image', command: 'docker rmi alpine:latest', explainer: 'Removes an image from local storage to free space.', sampleOutput: 'Untagged: alpine:latest\nDeleted: sha256:...' }
            ]
        },
        {
            id: 'containers',
            title: 'Container Operations',
            subtitle: 'Run, manage, and interact with containers',
            commands: [
                { title: 'Run hello command', description: 'Start a container, print message, then exit', command: 'docker run --rm alpine:latest echo "Docker is working!"', explainer: 'Runs Alpine and executes echo; the container is removed after it exits.', sampleOutput: 'Docker is working!' },
                { title: 'Interactive shell', description: 'Open a shell inside alpine (exit with Ctrl-D)', command: 'docker run -it --name mybox alpine:latest sh', explainer: 'Drops you into a shell inside the container; use exit or Ctrl-D to quit.', sampleOutput: '/ #' },
                { title: 'Run in background', description: 'Start a long-running process', command: 'docker run -d --name background-task alpine:latest sleep 3600', explainer: 'Starts a container in detached mode that will run for 1 hour.', sampleOutput: 'abc123456789...' },
                { title: 'List running containers', description: 'Show currently running containers', command: 'docker ps', explainer: 'Shows running containers with names, ports and status.', sampleOutput: 'CONTAINER ID   IMAGE           COMMAND     CREATED     STATUS     PORTS   NAMES\nabc123...      alpine:latest   "sleep 36"  2 min ago   Up 2 min           background-task' },
                { title: 'List all containers', description: 'Show running and stopped containers', command: 'docker ps -a', explainer: 'Include stopped containers in the list.', sampleOutput: 'CONTAINER ID   IMAGE           COMMAND     CREATED     STATUS                     PORTS   NAMES\nabc123...      alpine:latest   "sleep 36"  2 min ago   Up 2 min                           background-task\ndef456...      alpine:latest   "echo hello" 5 min ago  Exited (0) 5 minutes ago           eager_pascal' },
                { title: 'Execute command in running container', description: 'Run a command in existing container', command: 'docker exec -it mybox ls -la', explainer: 'Executes a command inside an already running container.', sampleOutput: 'total 56\ndrwxr-xr-x    1 root     root          4096 Jan  1 00:00 .\ndrwxr-xr-x    1 root     root          4096 Jan  1 00:00 ..' },
                { title: 'View container logs', description: 'See output from a container', command: 'docker logs mybox', explainer: 'Shows the stdout/stderr output from a container.', sampleOutput: 'Docker is working!\nContainer started successfully' },
                { title: 'Stop container', description: 'Stop the container named mybox', command: 'docker stop mybox', explainer: 'Gracefully stop a running container.', sampleOutput: 'mybox' },
                { title: 'Start stopped container', description: 'Restart a stopped container', command: 'docker start mybox', explainer: 'Restarts a container that was previously stopped.', sampleOutput: 'mybox' },
                { title: 'Remove container', description: 'Remove the container named mybox', command: 'docker rm mybox', explainer: 'Delete a stopped container to free resources.', sampleOutput: 'mybox' },
                { title: 'Force remove running container', description: 'Stop and remove container in one command', command: 'docker rm -f mybox', explainer: 'Forcefully stops and removes a container.', sampleOutput: 'mybox' }
            ]
        },
        {
            id: 'files',
            title: 'Files & Volumes',
            subtitle: 'Mount volumes, copy files, and persist data',
            commands: [
                { title: 'Create and mount volume', description: 'Mount a host folder into container', command: 'mkdir -p ~/demo && docker run --rm -v ~/demo:/data alpine:latest sh -c "echo hi > /data/hello.txt && ls -l /data"', explainer: 'Creates a host folder and mounts it into /data inside the container, writes a file and lists it.', sampleOutput: '-rw-r--r--    1 root     root             3 Jan  1 00:00 hello.txt' },
                { title: 'View created file', description: 'Confirm the file persisted on host', command: 'ls -l ~/demo && cat ~/demo/hello.txt', explainer: 'Back on the host namespace, verify the file persisted via the volume.', sampleOutput: '-rw-r--r-- 1 root root 3 Jan  1 00:00 hello.txt\nhi' },
                { title: 'Copy file to container', description: 'Copy file from host to running container', command: 'echo "test content" > test.txt && docker cp test.txt mybox:/tmp/', explainer: 'Copies a file from the host filesystem into a running container.', sampleOutput: '' },
                { title: 'Copy file from container', description: 'Copy file from container to host', command: 'docker cp mybox:/tmp/test.txt ./copied-test.txt', explainer: 'Copies a file from inside a container to the host filesystem.', sampleOutput: '' },
                { title: 'Create named volume', description: 'Create a Docker-managed volume', command: 'docker volume create myvolume', explainer: 'Creates a named volume that Docker manages for data persistence.', sampleOutput: 'myvolume' },
                { title: 'Use named volume', description: 'Mount named volume in container', command: 'docker run --rm -v myvolume:/app/data alpine:latest sh -c "echo persistent > /app/data/file.txt"', explainer: 'Mounts the named volume and writes data to it.', sampleOutput: '' },
                { title: 'List volumes', description: 'Show all Docker volumes', command: 'docker volume ls', explainer: 'Lists all named volumes managed by Docker.', sampleOutput: 'DRIVER    VOLUME NAME\nlocal     myvolume' },
                { title: 'Remove volume', description: 'Delete a named volume', command: 'docker volume rm myvolume', explainer: 'Removes a named volume and all its data.', sampleOutput: 'myvolume' }
            ]
        },
        {
            id: 'network',
            title: 'Networking & Ports',
            subtitle: 'Expose ports, connect containers',
            commands: [
                { title: 'Run HTTP server', description: 'Start NGINX on port 8080', command: 'docker run -d --name web -p 8080:80 nginx:alpine', explainer: 'Launches NGINX and maps container port 80 to host port 8080.', sampleOutput: 'abcd1234567890...' },
                { title: 'Test HTTP server', description: 'Fetch the default page headers', command: 'curl -I localhost:8080', explainer: 'Uses curl to validate the server responds on the mapped port.', sampleOutput: 'HTTP/1.1 200 OK\nServer: nginx/1.21.x\nContent-Type: text/html' },
                { title: 'Run Python web server', description: 'Simple Python HTTP server', command: 'docker run -d --name pyserver -p 8000:8000 python:3.9-slim python -m http.server 8000', explainer: 'Starts Python\'s built-in HTTP server on port 8000.', sampleOutput: 'def456789012...' },
                { title: 'Show port mappings', description: 'List all port mappings', command: 'docker port web', explainer: 'Shows which host ports are mapped to container ports.', sampleOutput: '80/tcp -> 0.0.0.0:8080' },
                { title: 'Create custom network', description: 'Create a Docker network', command: 'docker network create mynetwork', explainer: 'Creates a custom network for container communication.', sampleOutput: 'abc123456789...' },
                { title: 'List networks', description: 'Show all Docker networks', command: 'docker network ls', explainer: 'Lists all available Docker networks.', sampleOutput: 'NETWORK ID     NAME        DRIVER    SCOPE\nabc123...      bridge      bridge    local\ndef456...      mynetwork   bridge    local' },
                { title: 'Run container on network', description: 'Connect container to custom network', command: 'docker run -d --name app --network mynetwork alpine:latest sleep 3600', explainer: 'Starts a container connected to the custom network.', sampleOutput: 'ghi789012345...' },
                { title: 'Stop and cleanup', description: 'Cleanup server containers', command: 'docker rm -f web pyserver', explainer: 'Force remove multiple containers to free resources and ports.', sampleOutput: 'web\npyserver' }
            ]
        },
        {
            id: 'build',
            title: 'Building Images',
            subtitle: 'Create custom images with Dockerfile',
            commands: [
                { title: 'Create simple Dockerfile', description: 'Write a basic Dockerfile', command: 'cat << EOF > Dockerfile\nFROM alpine:latest\nRUN apk add --no-cache curl\nCMD ["curl", "--version"]\nEOF', explainer: 'Creates a Dockerfile that adds curl to Alpine Linux.', sampleOutput: '' },
                { title: 'Build custom image', description: 'Build image from Dockerfile', command: 'docker build -t mycurl:latest .', explainer: 'Builds a Docker image from the Dockerfile in current directory.', sampleOutput: 'Sending build context to Docker daemon...\nStep 1/3 : FROM alpine:latest\nStep 2/3 : RUN apk add --no-cache curl\nStep 3/3 : CMD ["curl", "--version"]\nSuccessfully built abc123...\nSuccessfully tagged mycurl:latest' },
                { title: 'Run custom image', description: 'Test the built image', command: 'docker run --rm mycurl:latest', explainer: 'Runs the custom image to test it works correctly.', sampleOutput: 'curl 7.80.0 (x86_64-alpine-linux-musl)' },
                { title: 'Create Python app Dockerfile', description: 'Dockerfile for Python app', command: 'cat << EOF > Dockerfile\nFROM python:3.9-slim\nWORKDIR /app\nRUN pip install flask\nCOPY . .\nEXPOSE 5000\nCMD ["python", "-c", "from flask import Flask; app=Flask(__name__); app.route(\'/\')(lambda: \'Hello Docker!\'); app.run(host=\'0.0.0.0\')"]\nEOF', explainer: 'Creates a Dockerfile for a simple Flask web application.', sampleOutput: '' },
                { title: 'Build multi-stage image', description: 'Build with multiple stages', command: 'docker build -t myapp:latest .', explainer: 'Builds the Python Flask application image.', sampleOutput: 'Sending build context to Docker daemon...\nSuccessfully tagged myapp:latest' },
                { title: 'Tag image for registry', description: 'Tag image with version', command: 'docker tag myapp:latest myapp:v1.0', explainer: 'Creates an additional tag for the same image.', sampleOutput: '' }
            ]
        },
        {
            id: 'monitoring',
            title: 'Monitoring & Debugging',
            subtitle: 'Monitor performance and troubleshoot',
            commands: [
                { title: 'Container resource usage', description: 'Show CPU, memory usage in real-time', command: 'docker stats', explainer: 'Displays live resource usage statistics for all running containers.', sampleOutput: 'CONTAINER ID   NAME    CPU %   MEM USAGE/LIMIT   MEM %   NET I/O     BLOCK I/O\nabc123...      web     0.00%   2.5MiB / 1GiB     0.25%   1.2kB/0B    0B/0B' },
                { title: 'Inspect container config', description: 'Show detailed container information', command: 'docker inspect mybox', explainer: 'Returns detailed JSON information about a container\'s configuration and state.', sampleOutput: '[\n  {\n    "Id": "abc123...",\n    "Created": "2024-01-01T00:00:00Z",\n    "State": {\n      "Status": "running"' },
                { title: 'Follow container logs', description: 'Stream logs in real-time', command: 'docker logs -f web', explainer: 'Continuously streams new log output from a container.', sampleOutput: '127.0.0.1 - - [01/Jan/2024:00:00:00 +0000] "GET / HTTP/1.1" 200 612' },
                { title: 'Show processes in container', description: 'List running processes', command: 'docker top mybox', explainer: 'Shows running processes inside a container.', sampleOutput: 'PID    USER     TIME   COMMAND\n1      root     0:00   sh\n15     root     0:00   sleep 3600' },
                { title: 'Container filesystem changes', description: 'Show file changes since start', command: 'docker diff mybox', explainer: 'Shows what files have been added, changed, or deleted in the container.', sampleOutput: 'A /tmp\nA /tmp/test.txt\nC /etc' },
                { title: 'Export container filesystem', description: 'Export container as tar', command: 'docker export mybox > mycontainer.tar', explainer: 'Exports the entire container filesystem as a tar archive.', sampleOutput: '' },
                { title: 'Get container IP address', description: 'Show container network info', command: 'docker inspect -f "{{.NetworkSettings.IPAddress}}" mybox', explainer: 'Extracts just the IP address from container inspection.', sampleOutput: '172.17.0.2' }
            ]
        }
    ];
    $scope.selectedCheatCategoryId = 'verify';

    $scope.openCheatSheet = function() {
        $mdDialog.show({
            templateUrl: 'cheatSheetDialog.html',
            parent: angular.element(document.body),
            clickOutsideToClose: true,
            scope: $scope,
            preserveScope: true
        });
    };

    $scope.closeCheatSheet = function() {
        $mdDialog.hide();
    };

    $scope.setCheatCategory = function(id) {
        $scope.selectedCheatCategoryId = id;
    };

    $scope.getCheatCommands = function() {
        var cat = ($scope.cheatSheet || []).find(function(c){ return c.id === $scope.selectedCheatCategoryId; });
        return cat ? cat.commands : [];
    };

    // Send a command to the terminal (adds a trailing newline)
    $scope.runCommand = function(command) {
        if (!$scope.instance) {
            $scope.showAlert('No Container', 'Please wait for your Docker container to be ready.');
            return;
        }
        try {
            var cmd = command.endsWith('\n') ? command : command + '\n';
            $scope.socket.emit('instance terminal in', $scope.instance.name, cmd);
        } catch (e) {
            $log.error('Failed to run command', e);
        }
    };

        // Clipboard notifications (requires ngclipboard)
        $scope.onCopied = function(e) {
                $mdDialog.show(
                    $mdDialog.alert().clickOutsideToClose(true)
                        .title('Copied!')
                        .textContent('Command copied to clipboard.')
                        .ok('OK')
                );
        };
        $scope.onCopyError = function(e) {
                $mdDialog.show(
                    $mdDialog.alert().clickOutsideToClose(true)
                        .title('Copy failed')
                        .textContent('Your browser blocked clipboard access. Please select the text and copy manually.')
                        .ok('OK')
                );
        };

    
    // Stats display functions
    $scope.getCpuUsage = function() {
        console.log('getCpuUsage called, instance:', $scope.instance);
        if (!$scope.instance) {
            return 'No Container';
        }
        console.log('CPU value:', $scope.instance.cpu, 'type:', typeof $scope.instance.cpu);
        if ($scope.instance.cpu === undefined || $scope.instance.cpu === null) {
            return 'N/A';
        }
        // CPU is typically a percentage value
        var cpu = parseFloat($scope.instance.cpu);
        if (isNaN(cpu)) {
            return 'Invalid';
        }
        return cpu.toFixed(1) + '%';
    };
    
    $scope.getMemoryUsage = function() {
        console.log('getMemoryUsage called, instance:', $scope.instance);
        if (!$scope.instance) {
            return 'No Container';
        }
        console.log('Memory value:', $scope.instance.mem, 'type:', typeof $scope.instance.mem);
        if ($scope.instance.mem === undefined || $scope.instance.mem === null) {
            return 'N/A';
        }
        // Memory might come in different formats, handle common cases
        var mem = $scope.instance.mem;
        if (typeof mem === 'string') {
            return mem;
        } else if (typeof mem === 'number') {
            // Convert bytes to MB if it's a large number (assume bytes)
            if (mem > 1024 * 1024) {
                return (mem / (1024 * 1024)).toFixed(1) + ' MB';
            } else {
                return mem.toFixed(1) + ' MB';
            }
        }
        return mem.toString();
    };
    
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
            console.log('Received instance stats:', stats);
            if ($scope.instance && $scope.instance.name === stats.instance) {
                console.log('Updating stats for instance:', $scope.instance.name);
                $scope.instance.mem = stats.mem;
                $scope.instance.cpu = stats.cpu;
                console.log('Updated instance object:', $scope.instance);
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
            console.log('Received session timer:', time);
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
