let http = require('http');
let fs = require('fs');
let util = require('util');
let cheerio = require('cheerio');

downloadCourse();

function downloadCourse() {
    let dirPath = "download/"
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
    let ids = process.argv.splice(2, 1);
    ids.forEach(function(id) {
        console.log(`****** Course ${id} ******`);
        fetchCourse(id);
    });
}

function fetchCourse(id) {
    let url = "http://www.imooc.com/learn/" + id

    http.get(url, function(res) {
        let html = '';
        res.on('data', function(chunk) {
                html += chunk;
            })
            .on('end', function() {
                let course = filterCourse(html);
                printCourse(course)
            });
    }).on('error', function() {
        console.log(`Get course ${id} data error!`);
    });
}

function filterCourse(html) {
    let $ = cheerio.load(html);
    let title = $('.course-infos h2').text().trim();
    let course = {
        title: title,
        chapters: []
    };
    // console.log(html);
    let $chapters = $('.chapter');
    // console.log('---------');
    $chapters.each(function(idx, item) {
        let $chapter = $(this);
        $chapter.find('strong').find('i,div').remove();
        let title = $chapter.find('strong').text().trim();
        let chapter = {
            title: title,
            videos: []
        };
        let $videos = $chapter.find('.video').children('li');
        $videos.each(function(idx, item) {
            let $video = $(this);
            $video.find('button,i').remove();
            let reg = /(\d{1,2}-\d{1,2})(.*)\((\d{2}:\d{2})\)/;
            let mah = reg.exec($video.text().replace(/\s/g, '').trim());
            let video = {
                id: $video.data('mediaId'),
                code: mah[1].trim(),
                name: mah[2].trim(),
                time: mah[3].trim()
            };
            chapter.videos.push(video);
        });
        course.chapters.push(chapter);
    });
    return course;
}

function printCourse(course) {
    let dirPath = `download/${course.title}/`;
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath);
    }
    let text = '';
    text += `${course.title}\n`;
    course.chapters.forEach(function(item) {
        let chapter = item;
        text += ` ${chapter.title} \n`;
        chapter.videos.forEach(function(item) {
            let video = item;
            text += `   ${video.code} ${video.name} ${video.time}\n`;
            fetchMedia(video.id, video.code, dirPath);
        });
    });
    console.log(text);
    fs.writeFile(dirPath + 'course-info.txt', text, (err) => {
        if (err) throw err;
        console.log('Course has been saved!');
    });
}

function fetchMedia(id, code, dirPath) {
    let url = 'http://www.imooc.com/course/ajaxmediainfo/?mode=html&mid=' + id;
    http.get(url, function(res) {
        let data = '';
        res.on('data', function(chunk) {
                data += chunk;
            })
            .on('end', function() {
                let media = filterMedia(data);
                downloadVideo(media, code, dirPath);
            });
    }).on('error', function() {
        console.log('Get course data error!');
    });
}

function filterMedia(data) {
    let json = JSON.parse(data).data.result;
    let media = {
        id: json.mid,
        name: json.name,
        path: json.mpath[2] // 普清0，高清1， 超清2
    };
    return media;
}


function downloadVideo(video, code, dirPath) {
    let url = video.path;
    let filename = `${code} ${video.name}.mp4`;

    let writeStream = fs.createWriteStream(dirPath + filename);
    writeStream.on('close', function() {});

    http.get(url, function(res) {
        let len = parseInt(res.headers['content-length'], 10);
        let cur = 0;
        res.pipe(writeStream);
        // console.log(`Download: ${filename}.`);
        res.on('data', function(chunk) {
                cur += chunk.length;
                //process.stdout.write(`Download: ${(100.0 * cur / len).toFixed(2)}% ${cur} bytes\r`);
            })
            .on('end', function() {
                // process.stdout.write('\n');
                console.log(`Download: success! ${filename}`);
            });
    }).on('error', function() {
        console.log(`Download: failure! ${filename}`);
    });
}
