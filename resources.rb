require 'json'

class Resource
	@@allres = []
	def initialize (key, type, filename, heavy=false)
		@data = {}
		@data[:key] = key
		@data[:type] = type
		@data[:filename] = filename
		@data[:heavy] = heavy
		@@allres << self
	end
	def getOutput (version)
		resop = {
			:key => @data[:key],
			:type => @data[:type],
			:heavy => @data[:heavy],
		}
		file = File.new(@data[:filename])
		resop[:mtime] = file.mtime.to_i
		if (version < resop[:mtime])
			resop[:content] = file.read
		end
		file.close
		resop
	end
	def self.output(client, params)
		version = params['v']
		if (version.nil? or version.first.nil?)
			version = 0
		else
			version = version.first.to_i
		end
		lite = (params['lite'].first == 'true')
		op = {}
		op[:v] = version
		op[:r] = []
		@@allres.each{ |res|
			resop = res.getOutput(version)
			if (lite and resop[:heavy])
				next
			end
			op[:r] << { :key => resop[:key], :type => resop[:type]}
			if (resop[:content].nil?)
				next
			end
			if resop[:mtime] > op[:v]
				op[:v] = resop[:mtime]
			end
			op[resop[:key]] = resop[:content]
		}
		client.puts("HTTP/1.1 200 OK")
		client.puts
		client.puts(op.to_json)
	end
end