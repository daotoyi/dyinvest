const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

exports.main = async (event) => {
  const code = typeof event?.code === "string" ? event.code.trim() : "";
  if (!code) {
    return {
      ok: false,
      code: "MISSING_PHONE_CODE",
      message: "缺少微信手机号授权码",
    };
  }

  try {
    const response = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    const phoneInfo = response.phoneInfo || response.phone_info;
    const phoneNumber =
      phoneInfo?.purePhoneNumber || phoneInfo?.pure_phone_number || "";
    if (!phoneNumber) {
      return {
        ok: false,
        code: "EMPTY_PHONE_NUMBER",
        message: "微信未返回有效手机号",
      };
    }
    return {
      ok: true,
      phoneNumber,
      countryCode: phoneInfo.countryCode || phoneInfo.country_code || "86",
    };
  } catch (error) {
    console.error("phoneLogin failed", {
      errCode: error?.errCode,
      errMsg: error?.errMsg,
    });
    return {
      ok: false,
      code: "PHONE_EXCHANGE_FAILED",
      message: "手机号验证服务暂不可用，请稍后重试",
    };
  }
};
