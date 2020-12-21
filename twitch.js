const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./twitch_util.js', { token: 'Nzg5NzMxMzg5NDYwMzE2MTY3.X92Uqw.GJvBi8Gc8rRQ8RfAHJwimdymAZw' });

manager.on('shardCreate', shard => console.log(`Starting up shard ${shard.id}`));
manager.spawn();