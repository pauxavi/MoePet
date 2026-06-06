#!/usr/bin/env python3
"""Print the display number (1-based) where the mouse cursor is."""
import ctypes, ctypes.util

cg = ctypes.CDLL(ctypes.util.find_library('CoreGraphics'))

class CGPoint(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double)]

class CGRect(ctypes.Structure):
    _fields_ = [('x', ctypes.c_double), ('y', ctypes.c_double), ('w', ctypes.c_double), ('h', ctypes.c_double)]

class CGEventRef(ctypes.c_void_p): pass
cg.CGEventCreate.restype = CGEventRef
cg.CGEventGetLocation.restype = CGPoint
cg.CGEventGetLocation.argtypes = [CGEventRef]
cg.CGDisplayBounds.restype = CGRect
cg.CGDisplayBounds.argtypes = [ctypes.c_uint32]

event = cg.CGEventCreate(None)
pos = cg.CGEventGetLocation(event)

max_d = 10
displays = (ctypes.c_uint32 * max_d)()
count = ctypes.c_uint32(0)
cg.CGGetActiveDisplayList(max_d, displays, ctypes.byref(count))

for i in range(count.value):
    b = cg.CGDisplayBounds(displays[i])
    if b.x <= pos.x < b.x + b.w and b.y <= pos.y < b.y + b.h:
        print(i + 1)
        break
else:
    print(1)
