import { Inject, Injectable, NotFoundException,Req,Res } from '@nestjs/common';
import { Issue } from './issues.dto';
import { ISSUE_MODEL } from '../database/database.constants';
import { IssueModel } from '../database/issue.model';
import * as multer from 'multer';
import * as AWS from 'aws-sdk';
import * as multerS3 from 'multer-s3';
import * as mongoose from 'mongoose';
import { AWS_S3_BUCKET_NAME  as BUCKET_NAME } from './aws.contants';
import { AWS_ACCESS_KEY_ID as ACCESS_KEY } from './aws.contants';
import { AWS_SECRET_ACCESS_KEY as SECRET_KEY } from './aws.contants';

const AWS_S3_BUCKET_NAME = BUCKET_NAME;
const s3 = new AWS.S3();
AWS.config.update({
  accessKeyId: ACCESS_KEY,
  secretAccessKey: SECRET_KEY,
});

@Injectable()
export class IssuesService {
  constructor(
    @Inject(ISSUE_MODEL) private issueModel: IssueModel
  ) { }

  async newIssue(data: Issue,@Req() req, @Res() res) {
    if(data.video != ''){
      try {
        var v_id = Date.now().toString();
        await this.s3_upload(data.video,AWS_S3_BUCKET_NAME,v_id);
        data.video = v_id;
        const createed = this.issueModel.create({...data},(error)=>{
          if(error){
            return res.status(404).json({"Save":"Fail"});
          }
          return res.status(200).json({"Save":"Success"});
        });
      } catch (error) {
        console.log(error);
        return res.status(500).json(`Failed to upload image file: ${error}`);
      }
    }else{
      this.issueModel.create({...data},(error)=>{
        if(error){
          return res.status(404).json({"Save":"Fail"});
        }
        return res.status(200).json({"Save":"Success"});
      });
    }
  }

  async s3_upload(file, bucket, name)
    {
      file = Buffer.from(file.replace(/^data:video\/\w+;base64,/, ""),'base64')
        const params = 
        {
            Bucket: bucket,
            Key: name,
            Body: file,
            ACL: "public-read",
            ContentType: 'video/mp4',
            ContentDisposition:"inline",
            CreateBucketConfiguration: 
            {
                LocationConstraint: "ap-south-1"
            }
        };

        try
        {
            let s3Response = await s3.upload(params).promise();
            console.log("SavedS3","PL");
        }
        catch (e)
        {
            console.log(e);
            return "Failed";
        }
    }
    public async find(id: string,@Req() req, @Res() res){
      if(id.length != 24)
        return "Wrong ID";
      const objectid = new mongoose.Types.ObjectId(id);
      var videoSrc = null;
      const issue = await this.issueModel.findById({ _id: objectid }).exec();
      if (!issue) {
        throw new NotFoundException(`Issue #${id} not found`);
      }
      issue.video = process.env.AWS_S3_PUBLIC_URL + issue.video;
      return res.status(200).json({"issue":issue});
    }
   
}
