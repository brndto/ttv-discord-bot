const { Client, MessageEmbed } = require('discord.js')
const DiscordClient = new Client()
const https = require('https')
const fs = require('fs')
const db = require('quick.db')
const got = require('got')

const prefix = 'ttv.'

String.prototype.equalsIgnoreCase = function( string ) {
    return this.toLowerCase() === string.toLowerCase()
}

String.prototype.containsIgnoreCase = function( string ) {
    return this.toLowerCase().indexOf(string.toLowerCase()) > -1
}

Object.size = function(obj) {
    var size = 0, key
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++
    }
    return size
}

var StreamerList = db.get('streamingbot-db')

if(StreamerList === null)
	console.warn("Streamer list is currently empty, add some streamers!")
else {
	console.log( `Streamer list contains `, StreamerList )
	console.log( `Streamer list length is `, Object.size(StreamerList) )
}

//Delete the databases:
// db.delete('streamingbot-db')
// db.delete('streamer-cache')

DiscordClient.on('ready', () => {
    DiscordClient.user.setStatus('available');
		DiscordClient.user.setActivity('YouTube', { type: 'WATCHING' });

		setInterval(function() {
			if(db.get('streamingbot-db') === null)
				return

			var AllGuilds = Object.keys(StreamerList);

			AllGuilds.forEach((GuildID, i) => {
				var CurrentGuild = DiscordClient.guilds.cache.get(GuildID)
				var GuildStreamers = db.get(`streamingbot-db.${GuildID}.streamers`)
				var AllStreamers = Object.keys(GuildStreamers);

				if (!CurrentGuild.roles.cache.find(r => r.name.containsIgnoreCase("LIVE NOW"))) {
					CurrentGuild.roles.create({
				          data:{
				          name: `🔴LIVE NOW`,
				          color: "RED"
				      }
				  })
				}

				AllStreamers.forEach((Streamer, i2) => {
					var CurrentStreamer = db.get(`streamingbot-db.${GuildID}.streamers.${Streamer}`)

					(async () => {
						try {

							var TTV_Username = CurrentStreamer.username

							var options = {
							  'method': 'GET',
							  'hostname': 'api.twitch.tv',
								'responseType': 'json',
							  'path': `/helix/streams?user_id=${CurrentStreamer.id}`,
							  'headers': {
							    'client-id': 'gp762nuuoqcoxypju8c569th9wz7q5',
							    'Authorization': 'Bearer vwwcau4c0ku3k7exj3aqtkk03pg9oy'
							  }
							};

							const response = await got('https://api.twitch.tv', options);

							if(response.statusCode === 200) {
								//No stream or replay(?) playing
								if(response.body.data.length < 1) {
									db.set(`streamer-cache.${TTV_Username}.streaming`, false)
									return;
								}

								if(db.get(`streamer-cache.${TTV_Username}.streaming`) === null || db.get(`streamer-cache.${TTV_Username}.streaming`) === undefined)
									db.set(`streamer-cache.${TTV_Username}.streaming`, false)

								if(db.get(`streamer-cache.${TTV_Username}.streaming`) !== false)
									return;

								const TwitchData = response.body.data[0]

								db.set(`streamer-cache.${TTV_Username}.streaming`, true)

								var ProfileName = db.get(`streamingbot-db.${GuildID}.streamers.${CurrentStreamer.username}.username`)
								var ProfileImage = db.get(`streamingbot-db.${GuildID}.streamers.${CurrentStreamer.username}.profile_image_url`)
								var TwitchURL = "https://www.twitch.tv/" + db.get(`streamingbot-db.${GuildID}.streamers.${CurrentStreamer.username}.username`)
								var NotificationMessage = db.get(`streamingbot-db.${GuildID}.streamers.${CurrentStreamer.username}.message`)

								var ChannelID = db.get(`streamingbot-db.${GuildID}.streamers.${CurrentStreamer.username}.channel`)

								const streamingEmbed = new MessageEmbed()
									.setColor('#0099ff')
									.setURL(TwitchURL)
									.setTitle(`${TwitchData.title}`)
									.setAuthor(ProfileName, ProfileImage, TwitchURL)
									.setDescription(NotificationMessage)
									.setThumbnail(ProfileImage)
									.setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${ProfileName}-450x250.jpg`)
									.setTimestamp()
									.setFooter(TwitchData.game_name, ProfileImage)

								DiscordClient.guilds.cache.get(GuildID).channels.cache.find(channel => channel.id === ChannelID).send(streamingEmbed)

								console.log( db.get(`streamingbot-db.${GuildID}.streamers.${TTV_Username}.display_name`) )
							}
						} catch (error) {
							console.log('error:', error);
						}
					})();

				});

			});

		}, 30000)
})

DiscordClient.on('presenceUpdate', (oldMember, newMember) => {
	console.log(`Received Presence Update!`)
	console.log(oldMember)
	console.log(newMember)
})

DiscordClient.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return

	let role = message.guild.roles.cache.find(r => r.name.containsIgnoreCase("LIVE NOW"));

	const command = message.content.split(prefix)[1].split(" ")[0]
	const args = message.content.split(prefix)[1].split(" ")
	args.shift()

	console.log(`Received command ${command} with args`, args)

	switch (command) {
		case "addstream":
			console.log(args, args.length)
			if(args.length < 3) {
				message.reply("The correct syntax is: !addstream <#channel> <twitch_username> <message to announce here>")
				return
			}
			if(args[0].match(/\<\#\d{1,}\>/) === null) {
				message.reply("Incorrect channel specified! You need to tag the channel!")
				return
			}

			var channelName = args[0]

			var ttv_username = args[1]

			var BroadcastMessage = ""
			args.forEach((item, i) => {
				console.log(item, i)
				if(i > 1)
					BroadcastMessage = BroadcastMessage + item + " "
			})

			//HTTP REQUEST HAPPENS HERE

			var options = {
			  'method': 'GET',
			  'hostname': 'api.twitch.tv',
				'responseType': 'json',
			  'path': `/helix/users?login=${args[1]}`,
			  'headers': {
			    'client-id': 'gp762nuuoqcoxypju8c569th9wz7q5',
			    'Authorization': 'Bearer vwwcau4c0ku3k7exj3aqtkk03pg9oy'
			  }
			};

			(async () => {
				try {
					const response = await got('https://api.twitch.tv', options);
					console.log('statusCode:', response.statusCode);
					console.log('body:', response.body.data);
					if(response.statusCode === 200) {
						const TwitchData = response.body.data[0]
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.id`, TwitchData.id)
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.username`, TwitchData.login)
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.profile_image_url`, TwitchData.profile_image_url)
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.display_name`, TwitchData.display_name)
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.channel`, args[0].replace("<#", "").replace(">", ""))
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.message`, BroadcastMessage.trim())
						db.set(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.message`, BroadcastMessage.trim())

						db.set(`streamer-cache.${ttv_username}.streaming`, false)

						var shardedChannelName = DiscordClient.guilds.cache.get(message.guild.id).channels.cache.find(channel => channel.id === args[0].replace("<#", "").replace(">", "")).name

						var ProfileName = db.get(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.username`)
						var ProfileImage = db.get(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.profile_image_url`)
						var TwitchURL = "https://www.twitch.tv/" + db.get(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.username`)
						var NotificationMessage = db.get(`streamingbot-db.${message.guild.id}.streamers.${ttv_username}.message`)

						const exampleEmbed = new MessageEmbed()
							.setColor('#0099ff')
							.setURL(TwitchURL)
							.setAuthor(ProfileName, ProfileImage, TwitchURL)
							.setDescription(NotificationMessage)
							.setThumbnail(ProfileImage)
							.setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${ProfileName}-450x250.jpg`)
							.setTimestamp()
							.setFooter(TwitchURL, ProfileImage)

						message.reply(`Successfully added twitch.tv/${ttv_username} as a new streamer to the channel '${shardedChannelName}'! Preview their notification below!`)

						message.reply(exampleEmbed)
					}
				} catch (error) {
					console.log('error:', error);
				}
			})();

			break
		default:

	}


	if(command === 'resetstreaming') {
		db.set(`streamer-cache.${args[0]}.streaming`, false)
		message.reply("We'll check if they're streaming again soon.")
	}

	if(command === 'yt') {
		DiscordClient.user.setActivity('YouTube', { type: 'PLAYING' })
	}

	if (command === 'stats' && ( message.author.username === "Brandito" || message.author.id === "293803976279851011" )) {
		const promises = [
			DiscordClient.shard.fetchClientValues('guilds.cache.size'),
			DiscordClient.shard.broadcastEval('this.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)'),
		]

		return Promise.all(promises)
			.then(results => {
				const totalGuilds = results[0].reduce((acc, guildCount) => acc + guildCount, 0)
				const totalMembers = results[1].reduce((acc, memberCount) => acc + memberCount, 0)

				const streamerCount = Object.size(db.get(`streamer-cache`))
				DiscordClient.user.setActivity(`${streamerCount} streamers across ${totalGuilds} servers with a total member count of ${totalMembers}.`, { type: 'WATCHING' })
			})
			.catch(console.error)
	}
})

DiscordClient.login('Nzg5NzMxMzg5NDYwMzE2MTY3.X92Uqw.GJvBi8Gc8rRQ8RfAHJwimdymAZw')