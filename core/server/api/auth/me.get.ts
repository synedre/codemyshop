

import { isProfileAdmin } from '~/server/utils/roles'
import { hubSessionShouldRenew, readHubSessionToken, setHubSessionCookie } from '~/server/utils/session'

const HUB_KNOCK_MAX_AGE_S = 60 * 60 * 24 * 365

export default defineEventHandler((event) => {
  const data = readHubSessionToken<any>(getCookie(event, 'hub_session'))
  if (!data) return { logged: false }
  
  
  if (hubSessionShouldRenew(data)) {
    const { iat: _iat, exp: _exp, ...payload } = data
    setHubSessionCookie(event, payload)
  }
  
  
  
  
  if ((data.userType ?? 'employee') === 'employee') {
    setCookie(event, 'hub_knock', '1', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: HUB_KNOCK_MAX_AGE_S })
  }
  return {
    logged:    true,
    id:        data.employeeId,
    email:     data.email,
    firstname: data.firstname,
    lastname:  data.lastname,
    role:      data.role,
    profileId: Number(data.profileId) || 0,
    isAdmin:   data.isAdmin ?? isProfileAdmin(data.profileId ?? 0),
    is_admin:  data.isAdmin ?? isProfileAdmin(data.profileId ?? 0),
    user_type: data.userType || 'employee',
    userType:  data.userType || 'employee',
    clientId:  data.clientId,
    
    studentId: data.studentId || null,
    pseudo:    data.pseudo || null,
  }
})
