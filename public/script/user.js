
$(document).ready(function () {
    const socket = io();

    function updateRank() {
      $.get('/rank', function (data) {
        const rankTable = $('#rank-table');
        rankTable.empty();

        rankTable.append('<h3>순위표</h3>');
        rankTable.append('<table class="boder"><tbody></tbody></table>');

        const topUsers = data.users.slice(0, 5);

        const tbody = rankTable.find('tbody');
        topUsers.forEach(function (user, index) {
          const rank = index + 1;
          tbody.append(`<tr><td>${rank}</td><td>${user.username}</td><td>${user.point}</td></tr>`);
        });
        $.get('/user-point', function(data) {
            $('#user-point').text(data.point + 'P');
        });
      });
    }

    // 페이지 로드 시 초기 업데이트
    updateRank();

    // 서버에서 'update-rank' 이벤트를 받을 때마다 업데이트
    socket.on('update-rank', updateRank);
  });
function openSendPointsPopup() {
    var recipient = prompt("받는 사람:");
    var points = prompt("포인트:");

    if (recipient !== null && points !== null) {
        $.ajax({
            type: "POST",
            url: "/send-points",
            data: { recipient: recipient, points: points },
            success: function() {
                alert("포인트가 성공적으로 전송되었습니다.");
            },
            error: function(error) {
                alert("포인트 전송 중 오류가 발생했습니다: " + error);
            }
        });
    }
}
