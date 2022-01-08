import { Body, Controller, Get, Post, Res, Inject, Req, Param, Query } from '@nestjs/common';
import { request, response, Response } from 'express';
import { Issue } from './issues.dto';
import { IssuesService } from './issues.service';
import * as AWS from "aws-sdk";

@Controller()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}
  
  @Post('/issues')
  async newIssue(@Body() data: Issue,@Req() request, @Res() response) {
    return this.issuesService.newIssue(data,request,response);
  }

  @Get('/issue')
  async findOne(@Query() query,@Req() request, @Res() response) {
    return this.issuesService.find(query.id,request,response);
  }
  
}
