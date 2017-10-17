module.exports = function (grunt) {
  grunt.initConfig ({
    // aws: grunt.file.readJSON('aws-keys.json'), // Read the file
    aws_s3: {
      options: {
        awsProfile: 'tremorlab',
        // accessKeyId: '<%= aws.accessKeyId %>',
        // secretAccessKey: '<%= aws.secretAccessKey %>',
        region: 'us-east-1',
        uploadConcurrency: 5, // 5 simultaneous uploads
        downloadConcurrency: 5, // 5 simultaneous downloads
      },
      live: {
        options: {
          bucket: 'favi-app',
          differential: true, // Only uploads the files that have changed
          gzipRename: 'ext', // when uploading a gz file, keep the original extension
        },
        files: [
            {expand: true, cwd: 'src', src: ['**'], dest: '/'}
        ],
      },
    },
    cloudfront: {
      options: {
        region: 'us-east-1',
        distributionId: 'E1B22UJPEK0NQJ',
        awsProfile: 'tremorlab',
        listInvalidations: true,
        listDistributions: false,
      },
      live: {
        CallerReference: Date.now ().toString (),
        Paths: {
          Quantity: 1,
          Items: ['/index.html'],
        },
      },
    },
  });

  grunt.loadNpmTasks ('grunt-aws-s3');
  grunt.loadNpmTasks ('grunt-cloudfront');
  
  grunt.registerTask('deploy', [
        // 'build',
        'aws_s3',
        'cloudfront'
    ]);
};
