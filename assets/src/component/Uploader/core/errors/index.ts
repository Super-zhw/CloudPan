import {
    OneDriveError,
    Policy,
    QiniuError,
    Response,
    UpyunError,
} from "../types";
import { sizeToString } from "../utils";

export enum UploaderErrorName {
    InvalidFile = "InvalidFile",
    NoPolicySelected = "NoPolicySelected",
    UnknownPolicyType = "UnknownPolicyType",
    FailedCreateUploadSession = "FailedCreateUploadSession",
    FailedDeleteUploadSession = "FailedDeleteUploadSession",
    HTTPRequestFailed = "HTTPRequestFailed",
    LocalChunkUploadFailed = "LocalChunkUploadFailed",
    SlaveChunkUploadFailed = "SlaveChunkUploadFailed",
    WriteCtxFailed = "WriteCtxFailed",
    RemoveCtxFailed = "RemoveCtxFailed",
    ReadCtxFailed = "ReadCtxFailed",
    InvalidCtxData = "InvalidCtxData",
    CtxExpired = "CtxExpired",
    RequestCanceled = "RequestCanceled",
    ProcessingTaskDuplicated = "ProcessingTaskDuplicated",
    OneDriveChunkUploadFailed = "OneDriveChunkUploadFailed",
    OneDriveEmptyFile = "OneDriveEmptyFile",
    FailedFinishOneDriveUpload = "FailedFinishOneDriveUpload",
    S3LikeChunkUploadFailed = "S3LikeChunkUploadFailed",
    S3LikeUploadCallbackFailed = "S3LikeUploadCallbackFailed",
    COSUploadCallbackFailed = "COSUploadCallbackFailed",
    COSPostUploadFailed = "COSPostUploadFailed",
    UpyunPostUploadFailed = "UpyunPostUploadFailed",
    QiniuChunkUploadFailed = "QiniuChunkUploadFailed",
    FailedFinishOSSUpload = "FailedFinishOSSUpload",
    FailedFinishQiniuUpload = "FailedFinishQiniuUpload",
    FailedTransformResponse = "FailedTransformResponse",
}

const RETRY_ERROR_LIST = [
    UploaderErrorName.FailedCreateUploadSession,
    UploaderErrorName.HTTPRequestFailed,
    UploaderErrorName.LocalChunkUploadFailed,
    UploaderErrorName.SlaveChunkUploadFailed,
    UploaderErrorName.RequestCanceled,
    UploaderErrorName.ProcessingTaskDuplicated,
    UploaderErrorName.FailedTransformResponse,
];

const RETRY_CODE_LIST = [-1];

export class UploaderError implements Error {
    public stack: string | undefined;
    constructor(public name: UploaderErrorName, public message: string) {
        this.stack = new Error().stack;
    }

    public Message(i18n: string): string {
        return this.message;
    }

    public Retryable(): boolean {
        return RETRY_ERROR_LIST.includes(this.name);
    }
}

// ?????????????????????????????????
export class FileValidateError extends UploaderError {
    // ??????????????????????????????
    public field: "size" | "suffix";

    // ?????????????????????
    public policy: Policy;

    constructor(message: string, field: "size" | "suffix", policy: Policy) {
        super(UploaderErrorName.InvalidFile, message);
        this.field = field;
        this.policy = policy;
    }

    public Message(i18n: string): string {
        if (this.field == "size") {
            return `????????????????????????????????????????????????${sizeToString(
                this.policy.maxSize
            )}???`;
        }

        return `??????????????????????????????????????????????????????????????????${
            this.policy.allowedSuffix
                ? this.policy.allowedSuffix.join(",")
                : "*"
        }???`;
    }
}

// ??????????????????
export class UnknownPolicyError extends UploaderError {
    // ?????????????????????
    public policy: Policy;

    constructor(message: string, policy: Policy) {
        super(UploaderErrorName.UnknownPolicyType, message);
        this.policy = policy;
    }
}

// ?????? API ??????
export class APIError extends UploaderError {
    constructor(
        name: UploaderErrorName,
        message: string,
        protected response: Response<any>
    ) {
        super(name, message);
    }

    public Message(i18n: string): string {
        let msg = `${this.message}: ${this.response.msg}`;
        if (this.response.error) {
            msg += ` (${this.response.error})`;
        }

        return msg;
    }

    public Retryable(): boolean {
        return (
            super.Retryable() && RETRY_CODE_LIST.includes(this.response.code)
        );
    }
}

// ????????????????????????
export class CreateUploadSessionError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedCreateUploadSession, "", response);
    }

    public Message(i18n: string): string {
        this.message = "????????????????????????";
        return super.Message(i18n);
    }
}

// ????????????????????????
export class DeleteUploadSessionError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedDeleteUploadSession, "", response);
    }

    public Message(i18n: string): string {
        this.message = "????????????????????????";
        return super.Message(i18n);
    }
}

// HTTP ????????????
export class HTTPError extends UploaderError {
    public response?: any;
    constructor(public axiosErr: any, protected url: string) {
        super(UploaderErrorName.HTTPRequestFailed, axiosErr.message);
        this.response = axiosErr.response;
    }

    public Message(i18n: string): string {
        return `????????????: ${this.axiosErr} (${this.url})`;
    }
}

// ????????????????????????
export class LocalChunkUploadError extends APIError {
    constructor(response: Response<any>, protected chunkIndex: number) {
        super(UploaderErrorName.LocalChunkUploadFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `?????? [${this.chunkIndex}] ????????????`;
        return super.Message(i18n);
    }
}

// ????????????????????????
export class RequestCanceledError extends UploaderError {
    constructor() {
        super(UploaderErrorName.RequestCanceled, "Request canceled");
    }
}

// ????????????????????????
export class SlaveChunkUploadError extends APIError {
    constructor(response: Response<any>, protected chunkIndex: number) {
        super(UploaderErrorName.SlaveChunkUploadFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `?????? [${this.chunkIndex}] ????????????`;
        return super.Message(i18n);
    }
}

// ??????????????????
export class ProcessingTaskDuplicatedError extends UploaderError {
    constructor() {
        super(
            UploaderErrorName.ProcessingTaskDuplicated,
            "Processing task duplicated"
        );
    }

    public Message(i18n: string): string {
        return "?????????????????????????????????????????????";
    }
}

// OneDrive ??????????????????
export class OneDriveChunkError extends UploaderError {
    constructor(public response: OneDriveError) {
        super(
            UploaderErrorName.OneDriveChunkUploadFailed,
            response.error.message
        );
    }

    public Message(i18n: string): string {
        return `??????????????????: ${this.message}`;
    }
}

// OneDrive ????????????????????????
export class OneDriveEmptyFileSelected extends UploaderError {
    constructor() {
        super(UploaderErrorName.OneDriveEmptyFile, "empty file not supported");
    }

    public Message(i18n: string): string {
        return `?????????????????????????????? OneDrive?????????????????????????????????????????????`;
    }
}

// OneDrive ????????????????????????
export class OneDriveFinishUploadError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.FailedFinishOneDriveUpload, "", response);
    }

    public Message(i18n: string): string {
        this.message = `????????????????????????`;
        return super.Message(i18n);
    }
}

// S3 ???????????????????????????
export class S3LikeChunkError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.S3LikeChunkUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `??????????????????: ${this.message}`;
    }
}

// OSS ???????????????
export class S3LikeFinishUploadError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.S3LikeChunkUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `????????????????????????: ${this.message} (${
            this.response.getElementsByTagName("Code")[0].innerHTML
        })`;
    }
}

// qiniu ??????????????????
export class QiniuChunkError extends UploaderError {
    constructor(public response: QiniuError) {
        super(UploaderErrorName.QiniuChunkUploadFailed, response.error);
    }

    public Message(i18n: string): string {
        return `??????????????????: ${this.message}`;
    }
}

// qiniu ???????????????
export class QiniuFinishUploadError extends UploaderError {
    constructor(public response: QiniuError) {
        super(UploaderErrorName.FailedFinishQiniuUpload, response.error);
    }

    public Message(i18n: string): string {
        return `????????????????????????: ${this.message}`;
    }
}

// COS ????????????
export class COSUploadError extends UploaderError {
    constructor(public response: Document) {
        super(
            UploaderErrorName.COSPostUploadFailed,
            response.getElementsByTagName("Message")[0].innerHTML
        );
    }

    public Message(i18n: string): string {
        return `????????????: ${this.message} (${
            this.response.getElementsByTagName("Code")[0].innerHTML
        })`;
    }
}

// COS ????????????????????????
export class COSUploadCallbackError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.COSUploadCallbackFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `????????????????????????`;
        return super.Message(i18n);
    }
}

// Upyun ????????????
export class UpyunUploadError extends UploaderError {
    constructor(public response: UpyunError) {
        super(UploaderErrorName.UpyunPostUploadFailed, response.message);
    }

    public Message(i18n: string): string {
        return `????????????: ${this.message}`;
    }
}

// S3 ????????????????????????
export class S3LikeUploadCallbackError extends APIError {
    constructor(response: Response<any>) {
        super(UploaderErrorName.S3LikeUploadCallbackFailed, "", response);
    }

    public Message(i18n: string): string {
        this.message = `????????????????????????`;
        return super.Message(i18n);
    }
}

// ??????????????????
export class TransformResponseError extends UploaderError {
    constructor(private response: string, parseError: Error) {
        super(UploaderErrorName.FailedTransformResponse, parseError.message);
    }

    public Message(i18n: string): string {
        return `??????????????????: ${this.message} (${this.response})`;
    }
}
