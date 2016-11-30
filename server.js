var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
const hbs = require('hbs');

var app = express();

const port = process.env.PORT || 3000;

app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));

app.get('/scrape', (req,res) => {
	var url = 'https://www.mturk.com/mturk/sorthits?searchSpec=HITGroupSearch%23T%231%2350%23-1%23T%23%21%23%21LastUpdatedTime%211%21%23%21&selectedSearchType=hitgroups&searchWords=&sortType=LastUpdatedTime%3A1&%2Fsort.x=20&%2Fsort.y=9&pageSize=50'; // base url
	var hits = [];
	request(url, (error,response,html) => {
		if (!error && response.statusCode === 200) {
			var $ = cheerio.load(html);
			$('span.requesterIdentity').each( (k,v) =>  hits[k] = { requester: $(v).text().trim() } ); // requester name
			$('a.capsulelink').each( (k,v) => hits[k].title = $(v).text().trim() );		// hit title
			$('span.reward').each( (k,v) => hits[k].pay = $(v).text().trim() ); // pay rate
			$('a:contains("View a HIT in this group")').each( (k,v) => $(v).attr('href') ? hits[k].url = ('https://www.mturk.com' + $(v).attr('href')).replace('preview','previewandaccept') : hits[k].url = 'https://www.mturk.com/mturk/searchbar?selectedSearchType=hitgroups&searchWords=' + encodeURIComponent(hits[k].requester) ); // link... search requester name if no link
			$('td.capsule_field_title:contains("Time Allotted:")').each( (k,v) => hits[k].timer = $(v).next().text().trim().replace('hour','hr').replace('minute','min').replace('second','sec') ); // hit timer
			$('a:contains("Qualifications Required:")').each( (k,v) => {	//hit qualifications
				hits[k].qual = [];
				if ( $(v).parent().next().text() )
					hits[k].qual.push( $(v).parent().next().text().replace(/(\n|\t|\s+)/g,'') );
				else if ( $(v).parent().parent().siblings() )
					hits[k].qual = $(v).parent().parent().siblings().children().children().children().text().trim().replace(/\n\t\t\t\t\t\t/g,' ').split('\n\n\t\t\t\t\t').map( a => a.trim().replace(/\n|\t/g,'')) ; //.replace(/\n|\t/g,'')
			});
			$('a:contains("Description:")').each( (k,v) => hits[k].description = $(v).parent().next().text() ); //hit description
			$('a:contains("HIT Expiration Date:")').each( (k,v) => hits[k].expiration = $(v).parent().next().text().trim().replace(/(\n|\s{2,})/g,'') ); //hit expiration date

			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify(hits, null, 2));
		}
	});
});

app.get('/interface', (req,res) => {
	res.render('interface.hbs');
});

app.get('/testing', (req,res) => {
	res.render('testing.hbs');
});

app.listen(port, () => {
	console.log(`scraper up on port ${port}`);
});