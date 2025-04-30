const groupSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'users' }],
  });
  
  module.exports = mongoose.model('groups', groupSchema);