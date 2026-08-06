const match = 'https://youtube.com/shorts/BKbrpnj-c0k?is=Zur9xTh_JqFSpMDt'.match(/(?:shorts\/|v=|youtu\.be\/|embed\/|\/v\/)([a-zA-Z0-9_-]{11})/);
console.log(match ? match[1] : 'no match');
