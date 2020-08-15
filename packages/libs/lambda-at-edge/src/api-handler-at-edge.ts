import { OriginRequestEvent } from "../types";
import { CloudFrontResultResponse, CloudFrontRequest } from "aws-lambda";
import aws from 'aws-sdk'

export const handler = async (event: OriginRequestEvent): Promise<CloudFrontResultResponse | CloudFrontRequest> => handle(event, 0)

const handle = async (event: OriginRequestEvent, retryCount: number): Promise<CloudFrontResultResponse | CloudFrontRequest> => {
  try {

    const lambda = new aws.Lambda({ region: 'us-east-2' })

    const response = await lambda.invoke({
      FunctionName: '<<FunctionName>>',
      InvocationType: 'RequestResponse',
      LogType: 'Tail',
      Payload: JSON.stringify(event.Records[0].cf),
    }).promise()

    if (response.LogResult)
      console.log('Logs of lambda execution: ',  Buffer.from(response.LogResult, 'base64').toString())

    if (response.FunctionError) {
      if (retryCount < 1)
        return handle(event, retryCount + 1)
      return {
        status: "500",
        body: JSON.stringify(
          {
            "result": null,
            "error": {
              type: "FunctionError",
              content: response.FunctionError + ': ' + response.LogResult,
            }
        })
      }
    }

    const result = JSON.parse(response.Payload as any || "{}")
    const status = (result.status || '500') + ''

    return {
      ...result,
      status
    }
  } catch(e) {
    return {
      status: "500",
      body: JSON.stringify({
        "result": null,
        "error": e
      })
    }
  }
}