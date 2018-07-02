require('dotenv').config()
const axios = require('axios');
const countries = require('./countries');

const matchApiUrl = 'https://worldcup.sfg.io/matches/today';
const slackUrl = process.env.SLACK_URL;
const channel = process.env.SLACK_CHANNEL || '#general';
const refreshTime = (process.env.REFRESH_TIME || 5) * 1000;
const timezone = parseInt(process.env.TIMEZONE || 0);

let cache = null;

function getResults() {
	axios.get(matchApiUrl)
		.then(({ data: allInformation }) => {
			let matches = extractMatches(allInformation);

			if (resultsChanged(matches)) {
				let msg = toSlackMessage(toPayload(matches));

				axios.post(slackUrl, msg)
					.then(({ data }) => console.log('Response:', data))
					.catch(console.log);
			}

			setTimeout(getResults, refreshTime);
		})
		.catch((err) => setTimeout(getResults, 60 * 1000));
}

function resultsChanged(matches) {
	if (! cache || JSON.stringify(matches) !== JSON.stringify(cache)) {
		cache = matches;
		return true;
	}

	return false;
}

function extractMatches(info) {
	return info.sort((m1, m2) => {
		return new Date(m1.datetime) - new Date(m2.datetime)
			|| Number(m1.fifa_id) - Number(m2.fifa_id);
	}).map(match => {
		return {
			home: toPlayer(match.home_team, true),
			away: toPlayer(match.away_team),
			start_time: toHours(match.datetime, match.status, match.venue),
			result: extractResult(match.home_team, match.away_team, match.status)
		};
	});
}

function toPlayer(team, leadingFlag) {
	let countryCode = countries[team.country].toLowerCase();
	let flag = `:flag-${countryCode}:`;

	return leadingFlag ? `${flag} ${team.country}` : `${team.country} ${flag}`;
}

function extractResult(home, away, status) {
	if (status === 'future') {
		return '-';
	}

	return `${home.goals} - ${away.goals}`;
}

// 21:00
function toHours(dateString, status, venue) {
	if (status !== 'future') {
		return status;
	}

	let timeParts = dateString.split('T')[1].split(':');
	timeParts[0] = Number(timeParts[0]) + timezone;

	return timeParts.slice(0, 2).join(':');
}

// :soccer: 21:00: :flag-fr: France 0 - 0 Germany :flag-de:
function toPayload(matches) {
	return matches.map(match => `:soccer: ${match.start_time}: ${match.home} ${match.result} ${match.away}`);
}

//   --data '{"text":"test", "channel": "#general}' \
function toSlackMessage(payload) {
	return {
		username: 'Soccer Bot',
		icon_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/2018_FIFA_World_Cup.svg/1200px-2018_FIFA_World_Cup.svg.png',
		text: payload.join("\n"),
		channel: channel,
	};
}

getResults();
