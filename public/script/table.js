var socket = io();
                var form = document.getElementById('form');
                var input = document.getElementById('input');
                var chat = document.getElementById('chat');

                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    if (input.value) {
                        var username = document.getElementById('user-name').textContent;
                        var message = input.value;
                        socket.emit('new chat message', {username: username, message: message});
                        input.value = '';
                    }
                });

                socket.on('chat messages', function(messages){
                    chat.innerHTML = '';
                    messages.forEach(message => {
                    var item = document.createElement('li');
                    item.textContent = message;
                    chat.appendChild(item);
                    });
                    window.scrollTo(0, document.body.scrollHeight);
                });
        var canvas = document.getElementById("canvas");
        var context = canvas.getContext("2d");
        var startButton = document.getElementById("startButton");

        var prizes = ['36', '35', '34', '33', '32', '31', '30', '29', '28', '27', '26', '25', '24', '23', '22', '21', '20', '19', '18', '17', '16', '15', '14', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];

        var startAngle = 0;
        var arc = Math.PI / (prizes.length / 2);
        var spinTimeout = null;
        var spinArcStart = 10;
        var spinTime = 0;
        var spinTimeTotal = 0;
        var ballAngle = 0; // 추가된 구슬 각도
        var startButton = document.getElementById("startButton");
        startButton.style.display = "none";


        function drawRouletteWheel() {
            context.clearRect(0, 0, canvas.width, canvas.height);

            context.strokeStyle = "black";
            context.lineWidth = 2;

            context.font = "bold 12px Arial";

            for (var i = 0; i < prizes.length; i++) {
                var angle = startAngle + i * arc;

                var color = i === 36 ? "green" : (i % 2 === 0 ? "red" : "black");

                context.fillStyle = color;

                context.beginPath();
                context.arc(canvas.width / 2, canvas.height / 2, 100, angle, angle + arc, false);
                context.lineTo(canvas.width / 2, canvas.height / 2);
                context.fill();
                context.stroke();

                context.save();
                context.fillStyle = "white";
                context.translate(canvas.width / 2 + Math.cos(angle + arc / 2) * 90, canvas.height / 2 + Math.sin(angle + arc / 2) * 90);
                context.rotate(angle + arc / 2 + Math.PI / 2);
                var text = prizes[i];
                context.fillText(text, -context.measureText(text).width / 2, 0);
                context.restore();
            }

            // 가운데 원 그리기
            context.beginPath();
            context.arc(canvas.width / 2, canvas.height / 2, 85, 0, 2 * Math.PI, false);
            context.fillStyle = "green";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "black";
            context.stroke();

            // 초록색 원에 선 그리기
            for (var i = 0; i < prizes.length; i++) {
                var angle = startAngle + i * arc;
                context.beginPath();
                context.moveTo(canvas.width / 2, canvas.height / 2);
                context.lineTo(canvas.width / 2 + Math.cos(angle) * 85, canvas.height / 2 + Math.sin(angle) * 85);
                context.strokeStyle = "gold";
                context.stroke();
            }

            context.beginPath();
            context.arc(canvas.width / 2, canvas.height / 2, 65, 0, 2 * Math.PI, false);
            context.fillStyle = "brown";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "black";
            context.stroke();

            for (var i = 0; i < 4; i++) {
                var angle = startAngle + i * arc * 45;
                context.beginPath();
                context.moveTo(canvas.width / 2, canvas.height / 2);
                context.lineTo(canvas.width / 2 + Math.cos(angle) * 65, canvas.height / 2 + Math.sin(angle) * 65);
                context.strokeStyle = "black";
                context.stroke();
            }

            context.beginPath();
            context.arc(canvas.width / 2, canvas.height / 2, 10, 0, 2 * Math.PI, false);
            context.fillStyle = "silver";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "black";
            context.stroke();

            // 구슬 그리기
            context.beginPath();
            context.arc(canvas.width / 2 + Math.cos(ballAngle) * 75, canvas.height / 2 + Math.sin(ballAngle) * 75, 5, 0, 2 * Math.PI, false);
            context.fillStyle = "white";
            context.fill();
            context.lineWidth = 2;
            context.strokeStyle = "black";
            context.stroke();
        }

        function resetRoulette() {
        startAngle = 0; // 룰렛의 시작 각도를 초기화
        ballAngle = 0; // 구슬의 각도를 초기화
        drawRouletteWheel(); // 초기화된 룰렛을 그립니다.
        }

        
        var bet;
        var money;

        function spinRouletteWheel() {
            bet = document.getElementById('bet').value;
            money = document.getElementById('money').value;
            const socket = io();
            socket.on('randomVars', function (data) {
                a = data.var1;
                b = data.var2;
            });
            resetRoulette();

            spinAngleStart = a * 10 + 10;
            spinTime = 0;
            spinTimeTotal = b * 3 + 4 * 1000;
            rotateWheel();
        }

        function rotateWheel() {
            spinTime += 30;
            if (spinTime >= spinTimeTotal) {
                stopRotateWheel();
                return;
            }
            var spinAngle = spinAngleStart - easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
            startAngle += (spinAngle * Math.PI / 180);
            ballAngle -= (spinAngle * Math.PI / 180); // 역방향으로 돌도록 수정
            drawRouletteWheel();
            spinTimeout = setTimeout('rotateWheel()', 30);
        }

        function calculateResult() {
            let number = Math.floor(((((((-(ballAngle * (180 / Math.PI)) % 360) - (360 - ((startAngle * (180 / Math.PI)) % 360))) + 360) % 360) + 10) / 10) / 1);

            $.ajax({
            url: '/bet',
            type: 'POST',
            data: {
                color: number % 2 === 0 ? 'r' : 'b',  // 숫자가 짝수면 'r', 홀수면 'b'
                num: number,
                bet: bet,    // 베팅 금액
                money: money   // 사용자의 현재 돈
            },
            success: function(response) {
                console.log(response.point);  // 업데이트된 포인트를 콘솔에 출력
            },
            error: function(error) {
                console.error(error);  // 오류가 발생하면 콘솔에 출력
            }
            });
        }

        function stopRotateWheel() {
            clearTimeout(spinTimeout);

            // 공의 현재 각도를 도 단위로 변환
            var currentAngleDegrees = ballAngle * (180 / Math.PI);

            // 룰렛의 현재 회전 각도를 도 단위로 변환
            var startAngleDegrees = startAngle * (180 / Math.PI);

            // 룰렛의 각도를 10으로 나눈 후 가장 가까운 정수로 반올림
            var roundedStartAngleDegrees = Math.round(startAngleDegrees / 10) * 10;

            // 룰렛의 초과 회전 각도를 계산
            var excessAngleDegrees = roundedStartAngleDegrees - startAngleDegrees;

            // 각도를 10으로 나눈 후 가장 가까운 정수로 반올림, 그리고 초과 회전 각도를 뺌
            var nearestAngleDegrees = Math.round(currentAngleDegrees / 10) * 10 - excessAngleDegrees;

            // 가장 가까운 정수 +5 또는 정수 -5 중 가장 가까운 곳으로 가도록 수정
            var targetAngleDegrees;

            if (Math.abs(nearestAngleDegrees + 5 - currentAngleDegrees) < Math.abs(nearestAngleDegrees - 5 - currentAngleDegrees)) {
                targetAngleDegrees = nearestAngleDegrees + 5;
            } else {
                targetAngleDegrees = nearestAngleDegrees - 5;
            }

            // 반올림된 각도를 라디안 단위로 변환
            var targetAngle = targetAngleDegrees * (Math.PI / 180);

            // 공을 움직이게 하는 함수
            var moveBall = function() {
                if (Math.abs(ballAngle - targetAngle) < 0.01) {
                    // 목표 각도에 도달하면 움직임을 멈춤
                    clearInterval(moveBallInterval);
                    calculateResult();
                } else {
                    // 공을 조금씩 움직임
                    ballAngle += (targetAngle - ballAngle) / 10;
                    drawRouletteWheel();
                }
            };

            // 일정 간격으로 공을 움직임
            var moveBallInterval = setInterval(moveBall, 30);
        }



        function easeOut(t, b, c, d) {
            var ts = (t /= d) * t;
            var tc = ts * t;
            return b + c * (tc + -3 * ts + 3 * t);
        }
        function showSeconds() {
            var date = new Date();
            var seconds = date.getSeconds();
            document.getElementById("seconds").innerHTML = 30 - (seconds % 30);
            if (seconds % 30 === 0) {
                spinRouletteWheel();
            }
        }


        setInterval(showSeconds, 1000);

        startButton.addEventListener("click", function() {
        });

        spinRouletteWheel();
        drawRouletteWheel();
        