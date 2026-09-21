#!/usr/bin/env python3
"""
Export every prototype state to exports/*.png with headless Chrome.

Usage:
  python3 -m http.server 8765            # serve this folder first
  python3 export-screens.py [--base http://localhost:8765] [--only login]

Auth pages are captured at 1440×900. Account pages are rendered in a tall
window and trimmed to the content height so the sticky bars / footers sit
where a user would see them.
"""
import argparse, os, subprocess, sys
from PIL import Image

CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'exports')

# (file name, url path+query, width, height, trim-to-content?)
SHOTS = [
    # ---- login ----
    ('login-default',            'login.html?export=1&state=default',      1440, 900, False),
    ('login-validation',         'login.html?export=1&state=validation',   1440, 900, False),
    ('login-error',              'login.html?export=1&state=failed',       1440, 900, False),
    ('login-locked',             'login.html?export=1&state=locked',       1440, 900, False),
    ('login-unverified',         'login.html?export=1&state=unverified',   1440, 900, False),
    ('login-social-only',        'login.html?export=1&state=social',       1440, 900, False),
    ('login-social-first-time',  'login.html?export=1&modal=finish',       1440, 900, False),
    ('login-success',            'login.html?export=1&state=success',      1440, 900, False),
    ('login-captcha',            'login.html?export=1&state=captcha',      1440, 900, False),
    # ---- register ----
    ('register-default',         'register.html?export=1&state=default',   1440, 1000, False),
    ('register-fr',              'register.html?export=1&state=fr',        1440, 1000, False),
    ('register-validation',      'register.html?export=1&state=validation',1440, 1000, False),
    ('register-breached',        'register.html?export=1&state=weakpw',    1440, 1000, False),
    ('register-exists',          'register.html?export=1&state=exists',    1440, 1000, False),
    ('register-verify',          'register.html?export=1&state=verify',    1440, 900,  False),
    ('register-done',            'register.html?export=1&state=done',      1440, 900,  False),
    ('register-apple-relay',     'register.html?export=1&state=apple',     1440, 1000, False),
    ('register-guest',           'register.html?export=1&state=guest',     1440, 1000, False),
    # ---- forgot password ----
    ('forgot-step1-account',     'forgot-password.html?export=1&jump=1',   1440, 900, False),
    ('forgot-step1-social-only', 'forgot-password.html?export=1&jump=1s',  1440, 900, False),
    ('forgot-step2-link-sent',   'forgot-password.html?export=1&jump=2m',  1440, 900, False),
    ('forgot-step3-new-password','forgot-password.html?export=1&jump=3',   1440, 900, False),
    ('forgot-step3-mismatch',    'forgot-password.html?export=1&jump=3e',  1440, 900, False),
    ('forgot-step3-breached',    'forgot-password.html?export=1&jump=3b',  1440, 900, False),
    ('forgot-step3-reused',      'forgot-password.html?export=1&jump=3h',  1440, 900, False),
    ('forgot-step4-success',     'forgot-password.html?export=1&jump=4',   1440, 900, False),
    # ---- account centre ----
    ('account-overview',         'account.html?export=1#overview',                 1440, 900,  False),
    ('account-profile',          'account.html?export=1#profile',                  1440, 1600, True),
    ('account-profile-dirty',    'account.html?export=1&demo=dirty#profile',       1440, 1600, True),
    ('account-profile-errors',   'account.html?export=1&demo=nickErr#profile',     1440, 1600, True),
    ('account-avatar-error',     'account.html?export=1&demo=avatarErr#profile',   1440, 1600, True),
    ('account-avatar-crop',      'account.html?export=1&modal=crop#profile',       1440, 900,  False),
    ('account-change-email',     'account.html?export=1&modal=contact#profile',    1440, 900,  False),
    ('account-orders',           'account.html?export=1&demo=orders',              1440, 1200, True),
    ('account-orders-returns',   'account.html?export=1&demo=ordersReturns',       1440, 1200, True),
    ('account-avatar-review',    'account.html?export=1&demo=avatarReview',        1440, 1600, True),
    ('account-security',         'account.html?export=1#security',                 1440, 3000, True),
    ('account-password-breached','account.html?export=1&demo=pwBreach#security',   1440, 2000, True),
    ('account-password-reused',  'account.html?export=1&demo=pwReused#security',   1440, 2000, True),
    ('account-password-wrong',   'account.html?export=1&demo=pwWrong#security',    1440, 2000, True),
    ('account-password-same',    'account.html?export=1&demo=pwSame#security',     1440, 2000, True),
    ('account-unlink-blocked',   'account.html?export=1&demo=unlinkLast#security', 1440, 1700, False),  # toast pins to viewport bottom
    ('account-delete-confirm',   'account.html?export=1&modal=delete#security',    1440, 900,  False),
    # ---- account centre · communications / privacy ----
    ('account-communications',   'account.html?export=1#notifications',            1440, 1900, True),
    ('account-comms-withdrawn',  'account.html?export=1&demo=prefWithdraw#notifications', 1440, 1900, True),
    ('account-comms-sms-error',  'account.html?export=1&demo=prefSmsErr#notifications',   1440, 1900, True),
    # ---- account centre · addresses ----
    ('account-addresses',        'account.html?export=1#addresses',                1440, 1400, True),
    ('account-addresses-empty',  'account.html?export=1&demo=addrEmpty#addresses', 1440, 1200, True),
    ('account-address-add',      'account.html?export=1&demo=addrAdd#addresses',   1440, 900,  False),
    ('account-address-edit',     'account.html?export=1&demo=addrEdit#addresses',  1440, 900,  False),
    ('account-address-error',    'account.html?export=1&demo=addrErr#addresses',   1440, 900,  False),
    ('account-address-remove',   'account.html?export=1&modal=removeAddress#addresses', 1440, 900, False),
    # ---- account centre · payment methods ----
    ('account-payment',          'account.html?export=1#payment',                  1440, 1400, True),
    ('account-payment-empty',    'account.html?export=1&demo=cardEmpty#payment',   1440, 1200, True),
    ('account-card-add',         'account.html?export=1&demo=cardAdd#payment',     1440, 900,  False),
    ('account-card-edit',        'account.html?export=1&demo=cardEdit#payment',    1440, 900,  False),
    ('account-card-error',       'account.html?export=1&demo=cardErr#payment',     1440, 900,  False),
    ('account-card-declined',    'account.html?export=1&demo=cardDeclined#payment',1440, 900,  False),
    ('account-card-remove',      'account.html?export=1&modal=removeCard#payment', 1440, 900,  False),
    ('cart-default',             'cart.html?export=1&demo=default',                 1440, 1600, True),
    ('cart-empty',               'cart.html?export=1&demo=empty',                   1440, 1200, True),
    ('cart-low-stock',           'cart.html?export=1&demo=low',                     1440, 1600, True),
    ('cart-unavailable',         'cart.html?export=1&demo=oos',                     1440, 1600, True),
    ('cart-price-changed',       'cart.html?export=1&demo=price',                   1440, 1600, True),
    ('cart-promo',               'cart.html?export=1&demo=promoOk',                 1440, 1600, True),
    ('cart-saved-for-later',     'cart.html?export=1&demo=saved',                   1440, 1400, True),
    ('cart-fr',                  'cart.html?export=1&demo=default&lang=fr',         1440, 1600, True),
    ('cart-mobile',              'cart.html?export=1&demo=default',                 390,  2200, True),
    ('checkout-shipping',        'checkout.html?export=1',                          1440, 2000, True),
    ('checkout-shipping-errors', 'checkout.html?export=1&demo=step1Err',            1440, 2400, True),
    ('checkout-review',          'checkout.html?export=1&demo=step2',               1440, 1800, True),
    ('checkout-review-consent',  'checkout.html?export=1&demo=step2Err',            1440, 1800, True),
    ('checkout-payment-saved',   'checkout.html?export=1&demo=step3',               1440, 1800, True),
    ('checkout-payment-moneris', 'checkout.html?export=1&demo=step3New',            1440, 1900, True),
    ('checkout-payment-declined','checkout.html?export=1&demo=payDeclined',         1440, 2000, True),
    ('checkout-3ds',             'checkout.html?export=1&demo=pay3ds',              1440, 900,  False),
    ('checkout-hst-on',          'checkout.html?export=1&prov=ON&demo=step2',       1440, 1800, True),
    ('checkout-qst-qc',          'checkout.html?export=1&prov=QC&demo=step2',       1440, 1900, True),
    ('checkout-confirmed',       'checkout.html?export=1&demo=done',                1440, 2200, True),
    ('checkout-confirmed-sms',   'checkout.html?export=1&demo=doneSms',             1440, 2200, True),
    ('checkout-email-failed',    'checkout.html?export=1&demo=doneEmailFail',       1440, 2200, True),
    ('checkout-privacy-modal',   'checkout.html?export=1&modal=privacy',            1440, 900,  False),
    # ---- flows / index / shadcn slices ----
    ('flows',                    'flows.html',                                     1440, 18500, True),
    ('index',                    'index.html',                                     1440, 5400, True),
    ('components',               'components.html',                                1440, 7200, True),
]


def trim(path, pad=48):
    """Crop trailing rows that match the page background."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    bg = im.getpixel((w // 2, h - 1))
    px = im.load()
    last = h - 1
    while last > 0 and all(abs(px[x, last][i] - bg[i]) < 4 for x in range(0, w, 8) for i in range(3)):
        last -= 1
    im.crop((0, 0, w, min(h, last + pad))).save(path)


def shoot(name, url, w, h, do_trim, base):
    out = os.path.join(OUT, name + '.png')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
           f'--window-size={w},{h}', '--virtual-time-budget=1500', f'--screenshot={out}', f'{base}/{url}']
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if do_trim:
        trim(out)
    print(f'  {name}.png  {Image.open(out).size}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='http://localhost:8765')
    ap.add_argument('--only', default='', help='substring filter on file name')
    a = ap.parse_args()
    if not os.path.exists(CHROME):
        sys.exit(f'Chrome not found at {CHROME}; set CHROME=/path/to/chrome')
    os.makedirs(OUT, exist_ok=True)
    for name, url, w, h, t in SHOTS:
        if a.only and a.only not in name:
            continue
        shoot(name, url, w, h, t, a.base)
    print('done →', OUT)


if __name__ == '__main__':
    main()
