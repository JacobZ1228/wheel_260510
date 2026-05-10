/**
 * 多欄位細分版：將轉盤資料拆解至多個欄位儲存
 * A:房間, B:標題, C:主題, D:時間, E:力道, F:選項, G:組1, H:組2, I:組3, J:機會卡, K:命運卡, L:排行設定
 */

function doGet(e) {
  const room = e.parameter.room;
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; 
  const data = sheet.getDataRange().getValues();

  // 1. 列出房間
  if (action == 'list') {
    const rooms = data.map(row => row[0]).filter(r => r && r !== "房間名稱" && r !== "工作表1" && r !== "Name");
    return createJsonResponse({ success: true, rooms: rooms });
  }

  // 2. 重新命名房間
  if (action == 'rename' && room && e.parameter.newName) {
    const newName = e.parameter.newName;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() == String(room).trim()) {
        sheet.getRange(i + 1, 1).setValue(newName);
        return createJsonResponse({ success: true });
      }
    }
    return createJsonResponse({ success: false });
  }

  // 3. 刪除房間
  if (action == 'delete' && room) {
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() == String(room).trim()) {
        sheet.deleteRow(i + 1);
        return createJsonResponse({ success: true });
      }
    }
    return createJsonResponse({ success: false });
  }

  // 4. 讀取房間資料
  if (!room) return createJsonResponse({ success: false });
  // 從底部往上找，確保讀取到最新的一列
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0]).trim() == String(room).trim()) {
      const row = data[i];
      
      // 優先嘗試解析細分格式 (只要不是明顯的 JSON 括號開頭都算)
      const isJsonBlob = row[1] && String(row[1]).trim().indexOf('{') === 0;
      
      if (!isJsonBlob) {
        try {
          const state = {
            title: row[1] || "轉轉樂",
            theme: row[2] || "candy",
            duration: Number(row[3]) || 4,
            intensity: Number(row[4]) || 6,
            segments: String(row[5] || "").split(','),
            teams: [
              parseTeamStr(row[6], 1),
              parseTeamStr(row[7], 2),
              parseTeamStr(row[8], 3)
            ],
            chanceCards: JSON.parse(row[9] || '[]'),
            fateCards: JSON.parse(row[10] || '[]')
          };
          if (row[11]) {
            const rank = JSON.parse(row[11]);
            state.rankingTitle = rank.rt;
            state.rankingSize = rank.rs;
            state.rankingVisible = rank.rv;
            state.rankingPosition = rank.rp;
          }
          return createJsonResponse({ success: true, data: state });
        } catch (e) { continue; }
      } else {
        try {
          const jsonStr = row[1];
          if (!jsonStr) continue;
          return createJsonResponse({ success: true, data: JSON.parse(jsonStr) });
        } catch (err) { continue; }
      }
    }
  }
  return createJsonResponse({ success: false, message: "新房間" });
}

function doPost(e) {
  const rawPayload = e.postData.contents;
  let obj;
  let room = e.parameter.room; // 先嘗試從網址抓
  try {
    const parsed = JSON.parse(rawPayload);
    obj = parsed.data || parsed;
    room = room || parsed.room; // 如果網址沒有，就從資料包裹裡抓 (解決 A 欄空白問題)
  } catch(e) {
    return createJsonResponse({ success: false });
  }

  // 如果還是沒有房間名稱，拒絕儲存
  if (!room) {
    return createJsonResponse({ success: false, message: "Missing room name" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();

  const rowData = [
    room,
    obj.title || "轉轉樂",
    obj.theme || "candy",
    obj.duration || 4,
    obj.intensity || 6,
    (obj.segments || []).join(','),
    formatTeamStr(obj.teams, 0),
    formatTeamStr(obj.teams, 1),
    formatTeamStr(obj.teams, 2),
    JSON.stringify(obj.chanceCards || []),
    JSON.stringify(obj.fateCards || []),
    JSON.stringify({ rt: obj.rankingTitle, rs: obj.rankingSize, rv: obj.rankingVisible, rp: obj.rankingPosition })
  ];

  let foundRow = -1;
  // 同樣從底部往上找，更新最下面那一列
  for (let i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0]).trim() == String(room).trim()) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow > 0) {
    sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return createJsonResponse({ success: true });
}

// 輔助函式：將 "名稱 : 分數" 解析回物件
function parseTeamStr(str, id) {
  if (!str) return { id: id, name: "組別 " + id, score: 0 };
  const parts = String(str).split(':');
  return {
    id: id,
    name: parts[0] ? parts[0].trim() : "組別 " + id,
    score: parts[1] ? parseInt(parts[1]) || 0 : 0
  };
}

// 輔助函式：將物件轉成 "名稱 : 分數"
function formatTeamStr(teams, index) {
  if (!teams || !teams[index]) return "未設定 : 0";
  return `${teams[index].name} : ${teams[index].score}`;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
